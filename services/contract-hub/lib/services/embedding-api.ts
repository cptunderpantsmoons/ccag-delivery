/**
 * RAG Pipeline - Embedding Service
 * Uses OpenRouter API for generating embeddings (same as LD VECTOR app)
 * 
 * Supports embedding models on OpenRouter:
 * - nomic-embed-text-v1.5 (768 dimensions)
 * - text-embedding-ada-002 (1536 dimensions)
 * - voyage-3-large (1024 dimensions)
 */

// OpenRouter API configuration
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text-v1.5';
const EMBEDDING_DIMENSIONS = 768; // nomic-embed-text-v1.5

/**
 * Get API key for embeddings (check env vars in order of preference)
 */
function getEmbeddingApiKey(): string | null {
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.EMBEDDING_API_KEY ||
    process.env.OPENAI_API_KEY ||
    null
  );
}

/**
 * Generate embeddings using OpenRouter API
 */
export async function getEmbedding(
  text: string | string[]
): Promise<number[] | number[][]> {
  // Normalize input
  const texts = Array.isArray(text) ? text : [text];

  // Skip empty texts
  const validTexts = texts.map(t => t.trim()).filter(t => t.length > 0);

  if (validTexts.length === 0) {
    return Array.isArray(text) ? [] : [];
  }

  const apiKey = getEmbeddingApiKey();
  if (!apiKey) {
    console.warn('No OpenRouter API key configured for embeddings. Using placeholder vectors.');
    return validTexts.map(() => Array(EMBEDDING_DIMENSIONS).fill(0));
  }

  // Check for local Ollama service first (faster for development)
  const ollamaUrl = process.env.OLLAMA_EMBEDDING_URL;
  if (ollamaUrl) {
    try {
      const embeddings = await getOllamaEmbeddings(validTexts, ollamaUrl);
      if (embeddings.length > 0) {
        console.log(`Generated ${embeddings.length} embeddings via Ollama`);
        return Array.isArray(text) ? embeddings : embeddings[0];
      }
    } catch (error) {
      console.warn('Ollama embedding failed, falling back to OpenRouter:', error);
    }
  }

  // Use OpenRouter API
  try {
    const embeddings = await getOpenRouterEmbeddings(validTexts, apiKey);
    console.log(`Generated ${embeddings.length} embeddings via OpenRouter`);
    return Array.isArray(text) ? embeddings : embeddings[0];
  } catch (error) {
    console.error('OpenRouter embedding failed:', error);
    return validTexts.map(() => Array(EMBEDDING_DIMENSIONS).fill(0));
  }
}

/**
 * Get embeddings from Ollama (local, fast)
 * Uses nomic-embed-text model
 */
async function getOllamaEmbeddings(
  texts: string[],
  baseUrl: string
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const text of texts) {
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: text,
        model: 'nomic-embed-text',
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = await response.json();
    embeddings.push(data.embedding);
  }

  return embeddings;
}

/**
 * Get embeddings from OpenRouter API
 * Uses nomic-embed-text-v1.5 (768 dimensions)
 */
async function getOpenRouterEmbeddings(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  const results: number[][] = [];

  // OpenRouter supports batch embeddings for nomic-embed-text-v1.5
  // For other models, we may need to call individually
  
  for (const text of texts) {
    const truncatedText = text.length > 8000 ? text.slice(0, 8000) : text;

    const response = await fetch(`${OPENROUTER_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_NAME || 'Contract Hub',
        'X-Title': 'Contract Hub - CCG Australia',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: truncatedText,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter embedding error:', response.status, errorText);
      // Return placeholder on error
      results.push(Array(EMBEDDING_DIMENSIONS).fill(0));
      continue;
    }

    const data = await response.json();
    
    // Handle OpenRouter's response format
    if (data.data && data.data[0] && data.data[0].embedding) {
      results.push(data.data[0].embedding);
    } else if (data.embedding) {
      // Alternative format
      results.push(data.embedding);
    } else {
      console.error('Unexpected embedding response format:', JSON.stringify(data).slice(0, 200));
      results.push(Array(EMBEDDING_DIMENSIONS).fill(0));
    }
  }

  return results;
}

/**
 * Get embedding model configuration
 */
export function getEmbeddingModel(): { name: string; dimensions: number } {
  // Known dimension counts for supported models
  const dimensionMap: Record<string, number> = {
    'nomic-embed-text-v1.5': 768,
    'nomic-embed-text': 768,
    'text-embedding-ada-002': 1536,
    'text-embedding-3-small': 1536,
    'text-embedding-3-large': 3072,
    'voyage-3-large': 1024,
    'voyage-3': 1024,
    'cohere-embed-v3-large': 1024,
    'cohere-embed-v3-medium': 1024,
  };

  return {
    name: EMBEDDING_MODEL,
    dimensions: dimensionMap[EMBEDDING_MODEL] || EMBEDDING_DIMENSIONS,
  };
}

/**
 * Validate embedding dimensions match expected size
 */
export function validateEmbedding(
  embedding: number[],
  expectedDimensions: number = EMBEDDING_DIMENSIONS
): boolean {
  if (embedding.length !== expectedDimensions) {
    console.warn(
      `Embedding dimension mismatch: got ${embedding.length}, expected ${expectedDimensions}`
    );
    return false;
  }
  return true;
}

/**
 * Normalize embedding vector to unit length (L2 normalization)
 * Useful for cosine similarity calculations
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) return embedding;

  return embedding.map(val => val / magnitude);
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embedding dimensions must match');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);

  if (denominator === 0) return 0;

  return dotProduct / denominator;
}
