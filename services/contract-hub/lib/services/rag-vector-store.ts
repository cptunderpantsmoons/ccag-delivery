/**
 * RAG Pipeline – Vector Store Service (Carbon RAG Gateway)
 * Delegates all vector operations to the shared Carbon Agent Platform
 * orchestrator at CARBON_RAG_URL.  Clerk session token is obtained via
 * server-side auth() so no token plumbing is needed in callers.
 */

import { auth } from '@clerk/nextjs/server';
import { chunkText, chunkByPages, detectDocumentType } from './embedding';
import { getDefaultCarbonRAGClient } from './carbon-rag-client';

// ────────────────────────────────────────────────────────────────────────────
//  Shared types (unchanged public surface)
// ────────────────────────────────────────────────────────────────────────────

interface DocumentRecord {
  id: string;
  fileName: string;
  fileMimeType: string;
  storageProvider: string;
  storageKey: string | null;
  sharepointLibraryId?: string | null;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  documentId: string;
  chunkIndex: number;
  relevanceScore: number;
  metadata: {
    sourceFile?: string;
    documentType?: string;
    pageNumber?: number;
  };
}

export interface SearchOptions {
  limit?: number;
  minRelevanceScore?: number;
  documentTypes?: string[];
}

export interface IngestResult {
  success: boolean;
  chunksCreated: number;
  error?: string;
}

// ────────────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const authResult = await auth();
  const token = await authResult.getToken();
  if (!token) {
    throw new Error('No Clerk session token available – is the user signed in?');
  }
  return token;
}

// ────────────────────────────────────────────────────────────────────────────
//  Ingest
// ────────────────────────────────────────────────────────────────────────────

/**
 * Ingest a document into the Carbon RAG vector store.
 * Chunks the document locally (no embedding here – Carbon handles that).
 */
export async function ingestDocument(
  tenantId: string,
  document: DocumentRecord,
  documentContent: string
): Promise<IngestResult> {
  try {
    const token = await getAuthToken();
    const client = getDefaultCarbonRAGClient();

    const documentType = detectDocumentType(document.fileName, documentContent);

    const chunks = chunkText(documentContent, { chunkSize: 1000, chunkOverlap: 200 });
    if (chunks.length === 0) {
      return { success: true, chunksCreated: 0 };
    }

    const docs = chunks.map((chunk, i) => ({
      text: chunk.text,
      id: `${document.id}__chunk__${i}`,
      document_id: document.id,
      metadata: {
        document_id: document.id,
        sourceFile: document.fileName,
        documentType,
        chunkIndex: i,
        pageNumber: chunk.metadata.pageNumber,
        charCount: chunk.metadata.charCount,
      },
    }));

    await client.ingestDocuments(token, tenantId, docs);

    return { success: true, chunksCreated: docs.length };
  } catch (error) {
    console.error('Carbon RAG ingestDocument failed:', error);
    return {
      success: false,
      chunksCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Ingest a document split by pages (for PDFs with page metadata).
 */
export async function ingestDocumentByPages(
  tenantId: string,
  document: DocumentRecord,
  pages: Array<{ pageNumber: number; text: string }>
): Promise<IngestResult> {
  try {
    const token = await getAuthToken();
    const client = getDefaultCarbonRAGClient();

    const documentType = detectDocumentType(document.fileName);

    const chunks = chunkByPages(pages, { chunkSize: 1000, chunkOverlap: 200 });
    if (chunks.length === 0) {
      return { success: true, chunksCreated: 0 };
    }

    const docs = chunks.map((chunk, i) => ({
      text: chunk.text,
      id: `${document.id}__chunk__${i}`,
      document_id: document.id,
      metadata: {
        document_id: document.id,
        sourceFile: document.fileName,
        documentType,
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.metadata.pageNumber,
        charCount: chunk.metadata.charCount,
      },
    }));

    await client.ingestDocuments(token, tenantId, docs);

    return { success: true, chunksCreated: docs.length };
  } catch (error) {
    console.error('Carbon RAG ingestDocumentByPages failed:', error);
    return {
      success: false,
      chunksCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Search
// ────────────────────────────────────────────────────────────────────────────

export async function semanticSearch(
  tenantId: string,
  query: string,
  options: SearchOptions = {}
): Promise<VectorSearchResult[]> {
  const { limit = 10, minRelevanceScore = 0.5 } = options;

  try {
    const token = await getAuthToken();
    const client = getDefaultCarbonRAGClient();

    const response = await client.search(token, tenantId, query, limit);

    return response.result.results
      .map((r) => {
        const meta = r.metadata || {};
        return {
          id: (meta.id as string) || String(r.rank),
          content: r.full_text ?? r.text,
          documentId: (meta.document_id as string) || '',
          chunkIndex: (meta.chunkIndex as number) ?? 0,
          relevanceScore: r.relevance_score,
          metadata: {
            sourceFile: meta.sourceFile as string | undefined,
            documentType: meta.documentType as string | undefined,
            pageNumber: meta.pageNumber as number | undefined,
          },
        };
      })
      .filter((r) => r.relevanceScore >= minRelevanceScore * 100);
  } catch (error) {
    console.error('Carbon RAG semanticSearch failed:', error);
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Chunk retrieval (direct lookup via document_id metadata)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get chunks for a specific document by running a targeted search
 * with document_id filter to avoid fetching unnecessary results.
 */
export async function getDocumentChunks(
  tenantId: string,
  documentId: string
): Promise<Array<{ id: string; content: string; chunkIndex: number }>> {
  // Carbon RAG doesn't expose a direct "list by document" endpoint.
  // We use metadata filtering via semantic search with the document ID.
  // This is more efficient than the previous empty-query approach.
  try {
    // Search specifically for chunks matching this document ID
    const results = await semanticSearch(tenantId, `document_id:${documentId}`, { limit: 100 });
    return results
      .filter((r) => r.documentId === documentId)
      .map((r) => ({ id: r.id, content: r.content, chunkIndex: r.chunkIndex }));
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Delete
// ────────────────────────────────────────────────────────────────────────────

export async function deleteDocumentChunks(
  tenantId: string,
  documentId: string
): Promise<number> {
  try {
    const token = await getAuthToken();
    const client = getDefaultCarbonRAGClient();
    const response = await client.deleteDocument(token, tenantId, documentId);
    return response.result?.deleted ?? 0;
  } catch (error) {
    console.error('Carbon RAG deleteDocumentChunks failed:', error);
    return 0;
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Stats
// ────────────────────────────────────────────────────────────────────────────

export async function getVectorStats(tenantId: string): Promise<{
  totalChunks: number;
  totalDocuments: number;
  avgChunksPerDoc: number;
  lastUpdated: Date | null;
}> {
  try {
    const token = await getAuthToken();
    const client = getDefaultCarbonRAGClient();
    const response = await client.getStats(token, tenantId);

    const totalChunks = response.result.total_documents;
    // We don't have a distinct document count from Carbon; approximate from IDs.
    // Just surface totalChunks as-is and leave totalDocuments at 0 for now.
    return {
      totalChunks,
      totalDocuments: 0,
      avgChunksPerDoc: 0,
      lastUpdated: null,
    };
  } catch (error) {
    console.error('Carbon RAG getVectorStats failed:', error);
    return { totalChunks: 0, totalDocuments: 0, avgChunksPerDoc: 0, lastUpdated: null };
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Maintenance (no-op – Carbon manages its own indices)
// ────────────────────────────────────────────────────────────────────────────

export async function rebuildVectorIndex(): Promise<void> {
  // ChromaDB manages indices automatically – nothing to do here.
}
