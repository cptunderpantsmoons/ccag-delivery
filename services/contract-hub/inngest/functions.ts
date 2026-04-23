/**
 * Inngest Background Functions for Contract Hub
 * Handles async document ingestion, re-indexing, and batch processing
 * 
 * Pipeline: Upload → Extract → Chunk → Embed → Store in pgvector
 * 
 * Note: Inngest serializes Buffers between steps, so we combine download+extract
 * into single steps to avoid Buffer serialization issues.
 * 
 * @see https://www.inngest.com/docs/functions
 */

import { inngest } from './client';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { documentChunks, vectorIngestionJobs } from '@/lib/db/vector-schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getFile, StorageProvider } from '@/lib/services/storage';
import { extractDocumentPages, extractDocumentText } from '@/lib/services/document-extractor';
import { chunkText, chunkByPages } from '@/lib/services/embedding';
import { getEmbedding } from '@/lib/services/embedding-api';

// Type for chunk metadata
interface ChunkMetadata {
  sourceFile?: string;
  documentType?: string;
  pageNumber?: number;
  charCount: number;
}

interface TextChunk {
  text: string;
  chunkIndex: number;
  metadata: ChunkMetadata;
}

// ============================================================
// INGEST DOCUMENT FUNCTION
// ============================================================

/**
 * Ingest a single document into the vector store
 * Triggered by: 'document/uploaded' event
 * 
 * Steps:
 * 1. Fetch document record from DB
 * 2. Download file and extract text (combined to avoid Buffer serialization)
 * 3. Chunk the content
 * 4. Generate embeddings and store chunks
 * 5. Mark document as indexed
 */
export const ingestDocument = inngest.createFunction(
  { 
    id: 'ingest-document', 
    name: 'Ingest Document',
    triggers: [{ event: 'document/uploaded' }]
  },
  async ({ event, step }) => {
    const { documentId, tenantId } = event.data as { documentId: string; tenantId: string };

    // Step 1: Fetch document record
    const doc = await step.run('fetch-document', async () => {
      const [result] = await db.select().from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
        .limit(1);
      
      if (!result) {
        throw new Error(`Document ${documentId} not found in tenant ${tenantId}`);
      }
      
      // Mark as indexing
      await db.update(documents)
        .set({ vectorIndexStatus: 'indexing' })
        .where(eq(documents.id, documentId));
      
      return result;
    });

    // Step 2: Download file AND extract text (combined to avoid Buffer serialization)
    const extraction = await step.run('extract-text', async () => {
      // Download file
      const file = await getFile({
        provider: doc.storageProvider as StorageProvider,
        storageKey: doc.storageKey || '',
        fileName: doc.fileName,
        mimeType: doc.fileMimeType,
        sharepointLibraryId: doc.sharepointLibraryId,
      });
      
      const buffer = file.buffer;
      
      // Try page-level extraction first (better for legal docs with page references)
      if (doc.fileMimeType === 'application/pdf') {
        try {
          const pages = await extractDocumentPages(buffer, doc.fileMimeType, doc.fileName);
          
          if (pages.length > 0 && pages.some((p: { text: string }) => p.text.length > 10)) {
            return {
              success: true,
              pages,
              text: pages.map((p: { text: string }) => p.text).join('\n\n'),
              method: 'pdf-parse-pages',
              errorReason: undefined as string | undefined,
            };
          }
        } catch (e) {
          console.warn('PDF page extraction failed, falling back to full text:', e);
        }
      }
      
      // Fall back to full text extraction
      const result = await extractDocumentText(buffer, doc.fileMimeType, doc.fileName);
      return {
        success: result.wasSuccessful,
        text: result.text,
        pages: result.text ? [{ pageNumber: 1, text: result.text, charCount: result.text.length }] : [],
        method: result.extractionMethod,
        errorReason: result.errorReason,
      };
    });

    // Handle extraction failure
    if (!extraction.success || !extraction.text) {
      await step.run('mark-extraction-failed', async () => {
        await db.update(documents)
          .set({
            vectorIndexStatus: 'extraction_failed',
            vectorIndexError: extraction.errorReason || 'No text extracted',
          })
          .where(eq(documents.id, documentId));
      });
      return { success: false, reason: extraction.errorReason || 'Extraction failed' };
    }

    // Step 3: Chunk the content
    const chunks: TextChunk[] = await step.run('chunk-document', async () => {
      // Prefer page-level chunking if available
      const pageChunks = extraction.pages && extraction.pages.length > 0
        ? chunkByPages(extraction.pages, { chunkSize: 1000, chunkOverlap: 200 })
        : chunkText(extraction.text, { chunkSize: 1000, chunkOverlap: 200 });
      
      if (pageChunks.length === 0) {
        throw new Error('Document produced no chunks');
      }
      
      return pageChunks;
    });

    // Step 4: Create ingestion job record (optional - may not exist yet)
    let jobId: string | null = null;
    try {
      const job = await step.run('create-ingestion-job', async () => {
        const [created] = await db.insert(vectorIngestionJobs).values({
          tenantId,
          documentId,
          status: 'processing',
          startedAt: new Date(),
        }).returning();
        return created;
      }) as { id: string } | null | undefined;
      jobId = job?.id || null;
    } catch {
      // vectorIngestionJobs table may not exist yet - continue without it
      console.warn('vectorIngestionJobs table not found, skipping job tracking');
    }

    // Step 5: Batch embed and store chunks
    const result = await step.run('embed-and-store-chunks', async () => {
      const batchSize = 10;
      let processedCount = 0;
      
      // Process in batches for efficiency
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const texts = batch.map((c: TextChunk) => c.text);
        
        // Get embeddings for batch
        const embeddings = await getEmbedding(texts);
        
        // Store each chunk
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          const embedding = Array.isArray(embeddings[0]) 
            ? (embeddings as number[][])[j] 
            : (embeddings as number[]);
          
          if (embedding && embedding.length > 0 && !embedding.every((v: number) => v === 0)) {
            await db.insert(documentChunks).values({
              tenantId,
              documentId,
              chunkIndex: i + j,
              content: chunk.text,
              embeddingVector: `[${embedding.join(',')}]`,
              embeddingJson: JSON.stringify(embedding),
              metadata: {
                sourceFile: doc.fileName,
                pageNumber: chunk.metadata.pageNumber,
                charCount: chunk.metadata.charCount,
              },
            });
            processedCount++;
          }
        }
      }
      
      return { processedCount, totalChunks: chunks.length };
    });

    // Step 6: Mark document as indexed
    await step.run('mark-indexed', async () => {
      await db.update(documents)
        .set({
          vectorIndexed: true,
          vectorIndexedAt: new Date(),
          vectorIndexStatus: 'indexed',
          vectorIndexError: null,
        })
        .where(eq(documents.id, documentId));
      
      // Update job if it exists
      if (jobId) {
        await db.update(vectorIngestionJobs)
          .set({
            status: 'completed',
            totalChunks: chunks.length,
            processedChunks: result.processedCount,
            completedAt: new Date(),
          })
          .where(eq(vectorIngestionJobs.id, jobId));
      }
    });

    return {
      success: true,
      documentId,
      chunksCreated: result.processedCount,
      totalChunks: result.totalChunks,
    };
  }
);

// ============================================================
// RE-INDEX DOCUMENT FUNCTION
// ============================================================

/**
 * Re-index a document (manual trigger with retry)
 * Triggered by: 'document/reindex' event
 * 
 * Differs from ingestDocument:
 * - First deletes existing chunks
 * - Uses simpler extraction (no page-level)
 */
export const reindexDocument = inngest.createFunction(
  { 
    id: 'document-reindex', 
    name: 'Document Reindex', 
    retries: 3,
    triggers: [{ event: 'document/reindex' }]
  },
  async ({ event, step }) => {
    const { documentId, tenantId } = event.data as { documentId: string; tenantId: string };

    // Step 1: Create ingestion job record
    let jobId: string | null = null;
    try {
      const job = await step.run('create-job', async () => {
        const [created] = await db.insert(vectorIngestionJobs).values({
          tenantId,
          documentId,
          status: 'processing',
          startedAt: new Date(),
        }).returning();
        return created;
      }) as { id: string } | null | undefined;
      jobId = job?.id || null;
    } catch {
      console.warn('vectorIngestionJobs table not found, skipping job tracking');
    }

    // Step 2: Delete existing chunks
    const deletedCount = await step.run('delete-existing-chunks', async () => {
      const result = await db.delete(documentChunks)
        .where(and(
          eq(documentChunks.tenantId, tenantId),
          eq(documentChunks.documentId, documentId)
        ))
        .returning();
      return result.length;
    });

    // Step 3: Reset document status
    await step.run('reset-status', async () => {
      await db.update(documents)
        .set({
          vectorIndexed: false,
          vectorIndexedAt: null,
          vectorIndexStatus: 'pending',
          vectorIndexError: null,
        })
        .where(eq(documents.id, documentId));
    });

    // Step 4: Fetch document
    const doc = await step.run('fetch-document', async () => {
      const [result] = await db.select().from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
        .limit(1);
      
      if (!result) {
        throw new Error(`Document ${documentId} not found`);
      }
      return result;
    });

    // Step 5: Download file AND extract text (combined to avoid Buffer serialization)
    const extraction = await step.run('extract-text', async () => {
      const file = await getFile({
        provider: doc.storageProvider as StorageProvider,
        storageKey: doc.storageKey || '',
        fileName: doc.fileName,
        mimeType: doc.fileMimeType,
        sharepointLibraryId: doc.sharepointLibraryId,
      });
      
      const result = await extractDocumentText(file.buffer, doc.fileMimeType, doc.fileName);
      return {
        success: result.wasSuccessful,
        text: result.text,
        errorReason: result.errorReason,
      };
    });

    if (!extraction.success || !extraction.text) {
      await step.run('mark-failed', async () => {
        await db.update(documents)
          .set({
            vectorIndexStatus: 'extraction_failed',
            vectorIndexError: extraction.errorReason || 'Extraction failed',
          })
          .where(eq(documents.id, documentId));
        
        if (jobId) {
          await db.update(vectorIngestionJobs)
            .set({
              status: 'failed',
              errorMessage: extraction.errorReason || 'Extraction failed',
              completedAt: new Date(),
            })
            .where(eq(vectorIngestionJobs.id, jobId));
        }
      });
      throw new Error(`Extraction failed: ${extraction.errorReason}`);
    }

    // Step 6: Chunk text
    const chunks: TextChunk[] = await step.run('chunk-document', async () => {
      return chunkText(extraction.text, { chunkSize: 1000, chunkOverlap: 200 });
    });

    // Step 7: Embed and store all chunks
    const result = await step.run('embed-and-store-chunks', async () => {
      const batchSize = 10;
      let processedCount = 0;
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const texts = batch.map((c: TextChunk) => c.text);
        
        const embeddings = await getEmbedding(texts);
        
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          const embedding = Array.isArray(embeddings[0])
            ? (embeddings as number[][])[j]
            : (embeddings as number[]);
          
          if (embedding && embedding.length > 0 && !embedding.every((v: number) => v === 0)) {
            await db.insert(documentChunks).values({
              tenantId,
              documentId,
              chunkIndex: i + j,
              content: chunk.text,
              embeddingVector: `[${embedding.join(',')}]`,
              embeddingJson: JSON.stringify(embedding),
              metadata: {
                sourceFile: doc.fileName,
                documentType: doc.documentType,
                charCount: chunk.metadata?.charCount,
              },
            });
            processedCount++;
          }
        }
      }
      
      return { processedCount, totalChunks: chunks.length };
    });

    // Step 8: Mark as complete
    await step.run('mark-complete', async () => {
      await db.update(documents)
        .set({
          vectorIndexed: true,
          vectorIndexedAt: new Date(),
          vectorIndexStatus: 'indexed',
          vectorIndexError: null,
        })
        .where(eq(documents.id, documentId));

      if (jobId) {
        await db.update(vectorIngestionJobs)
          .set({
            status: 'completed',
            totalChunks: chunks.length,
            processedChunks: result.processedCount,
            completedAt: new Date(),
          })
          .where(eq(vectorIngestionJobs.id, jobId));
      }
    });

    return {
      success: true,
      documentId,
      chunksCreated: result.processedCount,
      deletedOldChunks: deletedCount,
    };
  }
);

// ============================================================
// BATCH INDEX DOCUMENTS FUNCTION
// ============================================================

/**
 * Batch re-index all documents for a tenant
 * Triggered by: 'tenant/batch-reindex' event
 * 
 * Uses concurrency limiting to avoid overwhelming the system
 */
export const batchIndexDocuments = inngest.createFunction(
  { 
    id: 'document-batch-index', 
    name: 'Document Batch Index', 
    concurrency: { limit: 2 },
    triggers: [{ event: 'tenant/batch-reindex' }]
  },
  async ({ event, step }) => {
    const { tenantId, documentIds } = event.data as { tenantId: string; documentIds?: string[] };

    // Step 1: Get documents to index
    const docsToIndex = await step.run('get-documents', async () => {
      let query = db.select().from(documents).where(eq(documents.tenantId, tenantId));
      
      // Filter by specific document IDs if provided
      if (documentIds && documentIds.length > 0) {
        query = db.select().from(documents)
          .where(and(
            eq(documents.tenantId, tenantId),
            inArray(documents.id, documentIds)
          ));
      }
      
      return query.limit(100);
    });

    if (docsToIndex.length === 0) {
      return { success: true, message: 'No documents to index', count: 0 };
    }

    // Step 2: Process each document
    const results = await step.run('process-documents', async () => {
      const MAX_CONCURRENT = 2;
      const batchResults: Array<{ documentId: string; success: boolean; chunks?: number; error?: string }> = [];
      
      // Process in batches of MAX_CONCURRENT
      for (let i = 0; i < docsToIndex.length; i += MAX_CONCURRENT) {
        const batch = docsToIndex.slice(i, i + MAX_CONCURRENT);
        
        // Process batch concurrently
        const batchResultsPromises = batch.map(async (doc) => {
          try {
            // Get file and extract in same step to avoid Buffer serialization
            const file = await getFile({
              provider: doc.storageProvider as StorageProvider,
              storageKey: doc.storageKey || '',
              fileName: doc.fileName,
              mimeType: doc.fileMimeType,
              sharepointLibraryId: doc.sharepointLibraryId,
            });

            // Extract text
            const extraction = await extractDocumentText(file.buffer, doc.fileMimeType, doc.fileName);
            if (!extraction.wasSuccessful || !extraction.text) {
              // Update document status
              await db.update(documents)
                .set({
                  vectorIndexStatus: 'extraction_failed',
                  vectorIndexError: extraction.errorReason || 'Extraction failed',
                })
                .where(eq(documents.id, doc.id));
              
              return { documentId: doc.id as string, success: false, error: extraction.errorReason };
            }

            // Chunk
            const chunks = chunkText(extraction.text, { chunkSize: 1000, chunkOverlap: 200 });

            // Embed and store
            let processedCount = 0;
            for (let j = 0; j < chunks.length; j++) {
              const embedding = await getEmbedding(chunks[j].text);
              const embeddingArray = Array.isArray(embedding[0]) 
                ? (embedding as number[][])[0] 
                : (embedding as number[]);

              if (embeddingArray && embeddingArray.length > 0 && !embeddingArray.every((v: number) => v === 0)) {
                await db.insert(documentChunks).values({
                  tenantId,
                  documentId: doc.id,
                  chunkIndex: j,
                  content: chunks[j].text,
                  embeddingVector: `[${embeddingArray.join(',')}]`,
                  embeddingJson: JSON.stringify(embeddingArray),
                  metadata: {
                    sourceFile: doc.fileName,
                    documentType: doc.documentType,
                    charCount: chunks[j].text.length,
                  },
                });
                processedCount++;
              }
            }

            // Mark as indexed
            await db.update(documents)
              .set({
                vectorIndexed: true,
                vectorIndexedAt: new Date(),
                vectorIndexStatus: 'indexed',
              })
              .where(eq(documents.id, doc.id));

            return { documentId: doc.id as string, success: true, chunks: processedCount };
          } catch (error) {
            // Update document status
            await db.update(documents)
              .set({
                vectorIndexStatus: 'failed',
                vectorIndexError: error instanceof Error ? error.message : 'Unknown error',
              })
              .where(eq(documents.id, doc.id));

            return { documentId: doc.id as string, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        });

        const batchResultsInner = await Promise.all(batchResultsPromises);
        batchResults.push(...batchResultsInner);
      }

      return batchResults;
    });

    const successCount = results.filter((r: { success: boolean }) => r.success).length;
    const failureCount = results.filter((r: { success: boolean }) => !r.success).length;

    return {
      success: true,
      message: `Batch indexing complete: ${successCount} succeeded, ${failureCount} failed`,
      total: docsToIndex.length,
      successful: successCount,
      failed: failureCount,
      results,
    };
  }
);

// ============================================================
// EXPORTS
// ============================================================

// Export the Inngest serve handler for API route
export const functions = [
  ingestDocument,
  reindexDocument,
  batchIndexDocuments,
];
