import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { inngest } from '@/inngest/client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/documents/[id]/reindex - Trigger document re-indexing via Inngest
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = await params;

    if (!UUID_RE.test(id)) {
      return errorResponse('Invalid document ID', 'VALIDATION_ERROR', 400);
    }

    // Dispatch the reindex event to Inngest
    await inngest.send({
      name: 'document/reindex',
      data: {
        documentId: id,
        tenantId: user.tenantId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Re-indexing queued. This may take a few minutes.' 
    });
  } catch (error) {
    console.error('Failed to dispatch reindex event:', error);
    return errorResponse('Failed to queue re-indexing', 'INNGEST_ERROR', 500);
  }
}
