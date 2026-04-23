import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { semanticSearch } from '@/lib/services/rag-vector-store';

const searchSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().int().min(1).max(50).optional().default(10),
  minRelevanceScore: z.number().min(0).max(1).optional().default(0.5),
  documentTypes: z.array(z.string()).optional(),
});

// GET /api/vector/search - Semantic search across documents
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = searchParams.get('limit');
    const minScore = searchParams.get('minScore');

    if (!query) {
      return errorResponse('Query parameter is required', 'VALIDATION_ERROR', 400);
    }

    const result = searchSchema.safeParse({
      query,
      limit: limit ? parseInt(limit) : undefined,
      minRelevanceScore: minScore ? parseFloat(minScore) : undefined,
    });

    if (!result.success) {
      return errorResponse('Invalid parameters', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    const searchResults = await semanticSearch(
      user.tenantId,
      result.data.query,
      {
        limit: result.data.limit,
        minRelevanceScore: result.data.minRelevanceScore,
        documentTypes: result.data.documentTypes,
      }
    );

    return NextResponse.json({
      success: true,
      query: result.data.query,
      results: searchResults,
      totalFound: searchResults.length,
    });
  } catch (error) {
    console.error('Vector search failed:', error);
    return errorResponse('Search failed', 'SEARCH_ERROR', 500);
  }
}
