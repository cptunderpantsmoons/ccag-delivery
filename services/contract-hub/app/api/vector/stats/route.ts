import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { getVectorStats } from '@/lib/services/rag-vector-store';

// GET /api/vector/stats - Get vector store statistics
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const stats = await getVectorStats(user.tenantId);

    return NextResponse.json({
      success: true,
      stats: {
        totalChunks: stats.totalChunks,
        totalDocuments: stats.totalDocuments,
        avgChunksPerDoc: stats.avgChunksPerDoc,
        lastUpdated: stats.lastUpdated,
      },
    });
  } catch (error) {
    console.error('Failed to get vector stats:', error);
    return errorResponse('Failed to get statistics', 'STATS_ERROR', 500);
  }
}
