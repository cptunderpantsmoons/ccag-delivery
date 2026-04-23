import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { getFile, type StorageProvider } from '@/lib/services/storage';
import { extractDocumentText } from '@/lib/services/document-extractor';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/documents/[id]/content
 *
 * Returns extracted plain-text content for a stored document.
 * Used by the AI Analysis page so the LLM receives the actual document body
 * rather than metadata placeholders.
 *
 * Extraction pipeline (document-extractor.ts):
 *   PDF  → pdf-parse  (or Marker GPU API when MARKER_ENABLED=true)
 *   DOCX → mammoth    (adm-zip fallback)
 *   TXT / CSV / MD / JSON → raw buffer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);

    const { id } = await params;
    if (!UUID_RE.test(id)) return errorResponse('Invalid document ID', 'VALIDATION_ERROR', 400);

    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.tenantId, user.tenantId)));

    if (!doc) return errorResponse('Document not found', 'NOT_FOUND', 404);

    if (!doc.storageKey) {
      return errorResponse('Document has no stored file', 'DOCUMENT_ERROR', 400);
    }

    // ── Fetch raw bytes from storage (local volume or SharePoint) ──────────
    let fileResult: Awaited<ReturnType<typeof getFile>>;
    try {
      fileResult = await getFile({
        provider: (doc.storageProvider as StorageProvider) || 'local',
        storageKey: doc.storageKey,
        fileName: doc.fileName,
        mimeType: doc.fileMimeType,
        sharepointLibraryId: doc.sharepointLibraryId,
      });
    } catch (err) {
      console.error('[content] Storage retrieval failed:', err);
      return errorResponse('Could not retrieve document file from storage', 'STORAGE_ERROR', 500);
    }

    // ── Extract text via the shared document-extractor service ─────────────
    const extracted = await extractDocumentText(
      fileResult.buffer,
      fileResult.mimeType,
      fileResult.fileName,
    );

    if (!extracted.wasSuccessful || !extracted.text) {
      // Surface the extraction failure reason so callers can show a meaningful message.
      return NextResponse.json(
        {
          success: false,
          error: extracted.errorReason || 'Text extraction produced no output',
          extractionMethod: extracted.extractionMethod,
          metadata: {
            id: doc.id,
            title: doc.title,
            documentType: doc.documentType,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            fileMimeType: doc.fileMimeType,
          },
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      content: extracted.text,
      metadata: {
        id: doc.id,
        title: doc.title,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileMimeType: doc.fileMimeType,
        status: doc.status,
        pageCount: extracted.pageCount,
        extractionMethod: extracted.extractionMethod,
        hasSharepointFile: !!doc.sharepointItemId,
      },
    });
  } catch (error) {
    console.error('Failed to fetch document content:', error);
    return errorResponse('Failed to fetch document content', 'CONTENT_ERROR', 500);
  }
}
