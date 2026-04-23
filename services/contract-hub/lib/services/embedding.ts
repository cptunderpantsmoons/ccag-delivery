/**
 * RAG Pipeline - Document Chunking Service
 * Intelligent text chunking optimized for legal documents
 */

export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export interface TextChunk {
  text: string;
  chunkIndex: number;
  metadata: {
    sourceFile?: string;
    documentType?: string;
    pageNumber?: number;
    charCount: number;
  };
}

const DEFAULT_OPTIONS: ChunkOptions = {
  chunkSize: 1000,
  chunkOverlap: 200,
};

/**
 * Lightweight recursive character text splitter
 * Avoids langchain dependency issues in Next.js
 */
class RecursiveTextSplitter {
  private separators = ['\n\n', '\n', '. ', ', ', ' ', ''];

  splitText(text: string, chunkSize: number, chunkOverlap: number): string[] {
    if (!text || text.length <= chunkSize) {
      return text ? [text] : [];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;

      // Try to break at a separator
      for (const sep of this.separators) {
        if (sep === '') break;
        const lastSep = text.lastIndexOf(sep, end);
        if (lastSep > start + chunkSize / 2) {
          end = lastSep + sep.length;
          break;
        }
      }

      const chunk = text.slice(start, end).trim();
      if (chunk) chunks.push(chunk);

      // Move forward with overlap
      start = end - chunkOverlap;
      if (start >= text.length) break;
    }

    return chunks;
  }
}

/**
 * Split text into overlapping chunks optimized for semantic search
 */
export function chunkText(
  text: string,
  options: Partial<ChunkOptions> = {}
): TextChunk[] {
  const { chunkSize, chunkOverlap } = { ...DEFAULT_OPTIONS, ...options };

  const splitter = new RecursiveTextSplitter();
  const chunks = splitter.splitText(text, chunkSize, chunkOverlap);

  return chunks.map((text, index) => ({
    text,
    chunkIndex: index,
    metadata: {
      charCount: text.length,
    },
  }));
}

/**
 * Split text by pages (for PDFs with page metadata)
 */
export function chunkByPages(
  pages: Array<{ pageNumber: number; text: string }>,
  options: Partial<ChunkOptions> = {}
): TextChunk[] {
  const { chunkSize, chunkOverlap } = { ...DEFAULT_OPTIONS, ...options };

  const splitter = new RecursiveTextSplitter();
  const allChunks: TextChunk[] = [];

  for (const page of pages) {
    if (!page.text?.trim()) continue;

    const pageChunks = splitter.splitText(page.text, chunkSize, chunkOverlap);

    for (let i = 0; i < pageChunks.length; i++) {
      allChunks.push({
        text: pageChunks[i],
        chunkIndex: allChunks.length,
        metadata: {
          pageNumber: page.pageNumber,
          charCount: pageChunks[i].length,
        },
      });
    }
  }

  return allChunks;
}

/**
 * Detect document type from filename/content
 */
export function detectDocumentType(
  filename: string,
  content?: string
): string {
  const lower = filename.toLowerCase();
  const contentLower = (content || '').toLowerCase().slice(0, 500);

  if (lower.includes('affidavit')) return 'affidavit';
  if (lower.includes('annexure')) return 'annexure';
  if (lower.includes('tender')) return 'tender_bundle';
  if (lower.includes('financial') || lower.includes('transaction')) return 'financial_disclosure';
  if (lower.includes('property') || lower.includes('orders')) return 'property_orders';
  if (lower.includes('nda') || lower.includes('non-disclosure')) return 'nda';
  if (lower.includes('msa') || lower.includes('master')) return 'msa';
  if (lower.includes('sow') || lower.includes('statement of work')) return 'sow';
  if (lower.includes('contract')) return 'contract';
  if (lower.includes('correspondence')) return 'correspondence';
  if (lower.includes('policy')) return 'policy';
  if (lower.includes('template')) return 'template';
  if (contentLower.includes('agreement made between') || contentLower.includes('party of the first part')) {
    return 'contract';
  }

  return 'other';
}

/**
 * Estimate token count (rough approximation for OpenAI compatible models)
 * ~4 chars per token for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate total tokens in chunks
 */
export function calculateTotalTokens(chunks: TextChunk[]): number {
  return chunks.reduce((sum, chunk) => sum + estimateTokens(chunk.text), 0);
}
