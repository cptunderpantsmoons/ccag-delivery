import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { getFile, type StorageProvider } from '@/lib/services/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/documents/[id]/download - streams the file from storage (local volume
// or SharePoint). Enforces tenant isolation.
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);

    const { id } = await context.params;
    if (!id) return errorResponse('Document id required', 'VALIDATION_ERROR', 400);

    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.tenantId, user.tenantId)))
      .limit(1);

    if (!doc) return errorResponse('Document not found', 'NOT_FOUND', 404);

    const provider = (doc.storageProvider as StorageProvider) || 'local';
    const storageKey = doc.storageKey || doc.sharepointItemId;
    if (!storageKey) {
      return errorResponse('Document has no stored file', 'NOT_FOUND', 404);
    }

    const file = await getFile({
      provider,
      storageKey,
      fileName: doc.fileName,
      mimeType: doc.fileMimeType,
      sharepointLibraryId: doc.sharepointLibraryId,
    });

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.fileName)}"`,
        'Content-Length': String(file.buffer.length),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Failed to download document:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to download document',
      'DOWNLOAD_ERROR',
      500,
    );
  }
}
