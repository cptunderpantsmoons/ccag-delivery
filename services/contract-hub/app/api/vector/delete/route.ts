import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { deleteDocumentChunks } from '@/lib/services/rag-vector-store';

const deleteSchema = z.object({
  documentId: z.string().uuid(),
});

// DELETE /api/vector/delete - Delete document from vector store
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const result = deleteSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Invalid parameters', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    const deletedCount = await deleteDocumentChunks(
      user.tenantId,
      result.data.documentId
    );

    return NextResponse.json({
      success: true,
      chunksDeleted: deletedCount,
    });
  } catch (error) {
    console.error('Failed to delete document chunks:', error);
    return errorResponse('Deletion failed', 'DELETE_ERROR', 500);
  }
}
