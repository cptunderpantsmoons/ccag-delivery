-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Document chunks table for RAG (stores vector embeddings)
-- Embeddings stored as text (JSON array) for Drizzle compatibility
-- The actual pgvector column is created separately for vector operations
CREATE TABLE document_chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index integer NOT NULL DEFAULT 0,
    content text NOT NULL,
    embedding_vector vector(768), -- nomic-embed-text-v1.5 produces 768-dim vectors
    embedding_json text, -- JSON array backup for portability
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for fast vector similarity search using HNSW
CREATE INDEX document_chunks_embedding_idx ON document_chunks USING hnsw (embedding_vector vector_cosine_ops);

-- Index for tenant-scoped queries
CREATE INDEX document_chunks_tenant_idx ON document_chunks (tenant_id);

-- Index for document_id lookups
CREATE INDEX document_chunks_document_idx ON document_chunks (document_id);

-- Composite index for filtered vector search
CREATE INDEX document_chunks_tenant_doc_idx ON document_chunks (tenant_id, document_id);

-- Table to track ingestion jobs
CREATE TABLE vector_ingestion_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    status varchar(50) DEFAULT 'pending' NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    total_chunks integer DEFAULT 0,
    processed_chunks integer DEFAULT 0,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX vector_ingestion_jobs_tenant_idx ON vector_ingestion_jobs (tenant_id);
CREATE INDEX vector_ingestion_jobs_status_idx ON vector_ingestion_jobs (status);

COMMENT ON TABLE document_chunks IS 'Stores text chunks with vector embeddings for semantic search';
COMMENT ON COLUMN document_chunks.embedding_vector IS '768-dimensional vector from nomic-embed-text-v1.5';
COMMENT ON COLUMN document_chunks.embedding_json IS 'JSON array backup of embedding vector';
COMMENT ON TABLE vector_ingestion_jobs IS 'Tracks document ingestion jobs for the RAG pipeline';
