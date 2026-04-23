/**
 * RAG-Enhanced AI Chat API
 * Uses semantic search to provide context from the document database
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { semanticSearch } from '@/lib/services/rag-vector-store';
import { getAIService } from '@/lib/services/opencode-ai';
import { getModelConfig } from '@/config/models';
import { rateLimit } from '@/lib/utils/rate-limiter';

const ragChatSchema = z.object({
  query: z.string().min(1).max(2000),
  mode: z.enum(['chat', 'analysis', 'research', 'compare']).default('chat'),
  documentContext: z.string().optional(),
  modelOverride: z.string().optional(),
  useRag: z.boolean().default(true),
  maxContextChunks: z.number().int().min(1).max(20).default(10),
});

interface RAGContext {
  sources: Array<{
    id: string;
    content: string;
    documentId: string;
    sourceFile?: string;
    documentType?: string;
    relevanceScore: number;
  }>;
  contextText: string;
}

async function buildRAGContext(
  tenantId: string,
  query: string,
  maxChunks: number
): Promise<RAGContext> {
  const searchResults = await semanticSearch(tenantId, query, {
    limit: maxChunks,
    minRelevanceScore: 0.4,
  });

  if (searchResults.length === 0) {
    return { sources: [], contextText: '' };
  }

  const sources = searchResults.map(r => ({
    id: r.id,
    content: r.content,
    documentId: r.documentId,
    sourceFile: r.metadata.sourceFile,
    documentType: r.metadata.documentType,
    relevanceScore: r.relevanceScore,
  }));

  // Build context text for the AI
  const contextText = sources
    .map((s, i) => `[Source ${i + 1}: ${s.sourceFile || 'Unknown Document'}]\n${s.content}`)
    .join('\n\n---\n\n');

  return { sources, contextText };
}

// POST /api/vector/ai - RAG-enhanced AI chat
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    // Rate limiting
    const rateLimitKey = `vector-ai-api:${user.tenantId}`;
    const rateLimitResult = rateLimit(rateLimitKey, { windowMs: 60000, maxRequests: 20 });
    if (!rateLimitResult.allowed) {
      return errorResponse(
        'Rate limit exceeded. Please try again later.',
        'RATE_LIMITED',
        429,
        { retryAfter: rateLimitResult.retryAfter }
      );
    }

    const body = await request.json();
    const result = ragChatSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Invalid parameters', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    const { query, documentContext, modelOverride, useRag, maxContextChunks } = result.data;

    // Build RAG context if enabled
    let ragContext: RAGContext = { sources: [], contextText: '' };
    if (useRag) {
      ragContext = await buildRAGContext(user.tenantId, query, maxContextChunks);
    }

    // Build user prompt
    let userPrompt = query;

    if (documentContext && useRag && ragContext.contextText) {
      userPrompt = `**USER QUERY:**\n${query}\n\n**RELEVANT DOCUMENTS FROM DATABASE:**\n${ragContext.contextText}\n\n**ADDITIONAL DOCUMENT (if any):**\n${documentContext}`;
    } else if (documentContext) {
      userPrompt = `**USER QUERY:**\n${query}\n\n**DOCUMENT TO ANALYZE:**\n${documentContext}`;
    } else if (useRag && ragContext.contextText) {
      userPrompt = `**USER QUERY:**\n${query}\n\n**RELEVANT DOCUMENTS FROM DATABASE:**\n${ragContext.contextText}`;
    }

    // Get model config
    const modelConfig = modelOverride
      ? getModelConfig(modelOverride)
      : getModelConfig('qwen3.6-plus-preview');

    const model = modelConfig?.model || 'qwen/qwen3.6-plus-preview';

    // Call AI with RAG context
    const aiService = getAIService();
    const analysisResult = await aiService.runAnalysis({
      entityType: 'document',
      entityId: 'rag-chat',
      analysisType: 'legal_advice',
      content: userPrompt,
      modelOverride: model,
      userId: user.userId,
      tenantId: user.tenantId,
    });

    if (!analysisResult.success) {
      return errorResponse(analysisResult.error || 'AI analysis failed', 'AI_ERROR', 500);
    }

    // Extract narrative from result
    const resultData = analysisResult.result as Record<string, unknown>;
    const response = typeof resultData === 'object' && resultData !== null
      ? (resultData.narrative as string || resultData.content as string || resultData.advice as string || JSON.stringify(resultData))
      : String(resultData);

    // Return with RAG metadata
    return NextResponse.json({
      success: true,
      response,
      rag: {
        sourcesFound: ragContext.sources.length,
        sources: ragContext.sources.slice(0, 5).map(s => ({
          sourceFile: s.sourceFile,
          documentType: s.documentType,
          relevanceScore: s.relevanceScore,
        })),
      },
      model: analysisResult.model,
      provider: analysisResult.provider,
    });
  } catch (error) {
    console.error('RAG AI chat failed:', error);
    return errorResponse('AI chat failed', 'AI_ERROR', 500);
  }
}

// GET /api/vector/ai - Test RAG pipeline
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    // Rate limiting for test endpoint (lower limit since it's just for diagnostics)
    const rateLimitKey = `vector-ai-test:${user.tenantId}`;
    const rateLimitResult = rateLimit(rateLimitKey, { windowMs: 60000, maxRequests: 10 });
    if (!rateLimitResult.allowed) {
      return errorResponse(
        'Rate limit exceeded. Please try again later.',
        'RATE_LIMITED',
        429,
        { retryAfter: rateLimitResult.retryAfter }
      );
    }

    // Quick test: search for "contract"
    const testResults = await semanticSearch(user.tenantId, 'contract agreement terms', {
      limit: 3,
    });

    return NextResponse.json({
      success: true,
      message: 'RAG pipeline is operational',
      testSearch: {
        query: 'contract agreement terms',
        resultsFound: testResults.length,
      },
    });
  } catch (error) {
    console.error('RAG pipeline test failed:', error);
    return errorResponse('RAG pipeline test failed', 'TEST_ERROR', 500);
  }
}
