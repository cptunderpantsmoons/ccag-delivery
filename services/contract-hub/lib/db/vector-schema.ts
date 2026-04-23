import { pgTable, uuid, text, integer, jsonb, timestamp, varchar } from 'drizzle-orm/pg-core';

// ============================================================
// VECTOR EMBEDDING SCHEMA - pgvector for RAG pipeline
// Uses nomic-embed-text-v1.5 (768 dimensions) via OpenRouter
// ============================================================

/**
 * Document chunks with vector embeddings for semantic search
 * - embedding_vector: pgvector column for fast similarity search (768 dims)
 * - embedding_json: JSON array backup for portability/serialization
 */
export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  documentId: uuid('document_id').notNull(),
  chunkIndex: integer('chunk_index').notNull().default(0),
  content: text('content').notNull(),
  // pgvector column for HNSW index (768 dimensions from nomic-embed-text-v1.5)
  embeddingVector: text('embedding_vector'),
  // JSON backup for portability
  embeddingJson: text('embedding_json'),
  metadata: jsonb('metadata').$type<{
    sourceFile?: string;
    documentType?: string;
    pageNumber?: number;
    charCount?: number;
  }>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Ingestion job tracking for RAG pipeline
 */
export const vectorIngestionJobs = pgTable('vector_ingestion_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  documentId: uuid('document_id'),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  totalChunks: integer('total_chunks').default(0),
  processedChunks: integer('processed_chunks').default(0),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Type exports
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
export type VectorIngestionJob = typeof vectorIngestionJobs.$inferSelect;
export type NewVectorIngestionJob = typeof vectorIngestionJobs.$inferInsert;
