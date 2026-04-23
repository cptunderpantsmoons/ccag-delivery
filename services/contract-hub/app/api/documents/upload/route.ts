import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/current-user';
import { ensureUserUuid } from '@/lib/auth/ensure-user';
import { errorResponse } from '@/lib/api-errors';
import { putFile } from '@/lib/services/storage';
import { inngest } from '@/inngest/client';

// ============================================================
// Document Upload (multipart)
// Persists the file to SharePoint when configured, otherwise to the
// local Railway volume. Always creates the DB row so files never get lost.
// ============================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_MIME = new Set<string>([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const ALLOWED_TYPES = new Set([
  'contract',
  'legal_opinion',
  'policy',
  'template',
  'correspondence',
  'nda',
  'msa',
  'sow',
  'amendment',
  'other',
]);

const ALLOWED_STATUS = new Set(['active', 'review', 'archived', 'draft']);
const MAX_FILE_SIZE = 40 * 1024 * 1024; // 40MB

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return errorResponse('File is required', 'VALIDATION_ERROR', 400);
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return errorResponse('File size invalid (must be 1 byte - 40MB)', 'VALIDATION_ERROR', 400);
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return errorResponse(`Unsupported file type: ${file.type || 'unknown'}`, 'VALIDATION_ERROR', 400);
    }

    const title = String(form.get('title') ?? '').trim();
    const documentType = String(form.get('documentType') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    const tagsRaw = String(form.get('tags') ?? '').trim();
    const statusRaw = String(form.get('status') ?? 'active').trim();

    if (!title || title.length > 500) {
      return errorResponse('Title is required (max 500 chars)', 'VALIDATION_ERROR', 400);
    }
    if (!ALLOWED_TYPES.has(documentType)) {
      return errorResponse('Invalid documentType', 'VALIDATION_ERROR', 400);
    }
    const status = ALLOWED_STATUS.has(statusRaw) ? statusRaw : 'active';

    const tags = tagsRaw
      ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const userUuid = await ensureUserUuid(user);
    const buffer = Buffer.from(await file.arrayBuffer());

    const stored = await putFile({
      tenantId: user.tenantId,
      fileName: file.name,
      contentType: file.type,
      buffer,
      metadata: { title, documentType },
    });

    const [newDoc] = await db
      .insert(documents)
      .values({
        tenantId: user.tenantId,
        uploadedBy: userUuid,
        title,
        documentType: documentType as typeof documents.documentType.enumValues[number],
        fileName: file.name,
        fileSize: file.size,
        fileMimeType: file.type,
        description: description || null,
        tags: tags.length ? JSON.stringify(tags) : null,
        status,
        storageProvider: stored.provider,
        storageKey: stored.storageKey,
        storageChecksum: stored.checksum,
        sharepointSiteId: stored.sharepoint?.siteId ?? null,
        sharepointLibraryId: stored.sharepoint?.libraryId ?? null,
        sharepointItemId: stored.sharepoint?.itemId ?? null,
        sharepointWebUrl: stored.sharepoint?.webUrl ?? null,
        sharepointETag: stored.sharepoint?.eTag ?? null,
        // Vector indexing fields for RAG pipeline
        vectorIndexStatus: 'pending',
        vectorIndexed: false,
      })
      .returning();

    // Dispatch Inngest event for async vector indexing
    if (newDoc) {
      await inngest.send({
        name: 'document/uploaded',
        data: {
          documentId: newDoc.id,
          tenantId: user.tenantId,
          fileName: file.name,
          documentType,
        },
      }).catch(err => {
        console.error('Failed to dispatch document/uploaded event:', err);
        // Don't fail the upload if event dispatch fails
      });
    }

    return NextResponse.json({ success: true, data: newDoc }, { status: 201 });
  } catch (error) {
    console.error('Failed to upload document:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to upload document',
      'UPLOAD_ERROR',
      500,
    );
  }
}
