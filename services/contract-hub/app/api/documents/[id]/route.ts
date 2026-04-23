import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { deleteFile, type StorageProvider } from '@/lib/services/storage';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validation schema for document updates
const updateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  documentType: z.enum([
    'contract', 'legal_opinion', 'policy', 'template',
    'correspondence', 'nda', 'msa', 'sow', 'amendment', 'other',
  ]).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'review', 'archived', 'draft']).optional(),
  sharepointETag: z.string().optional(),
});

// GET /api/documents/[id] - Get a single document by ID
export async function GET(
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

    const [doc] = await db.select().from(documents).where(
      and(eq(documents.id, id), eq(documents.tenantId, user.tenantId))
    );

    if (!doc) {
      return errorResponse('Document not found', 'NOT_FOUND', 404);
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error('Failed to fetch document:', error);
    return errorResponse('Failed to fetch document', 'DATABASE_ERROR', 500);
  }
}

// PUT /api/documents/[id] - Update a document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = await params;
    const body = await request.json();

    const result = updateDocumentSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Validation error', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    const validated = result.data;

    // Filter out undefined values to prevent NULL overwrites in database
    const cleanData = Object.fromEntries(
      Object.entries(validated).filter(([, value]) => value !== undefined)
    );

    const [updated] = await db
      .update(documents)
      .set({
        ...cleanData,
        tags: validated.tags ? JSON.stringify(validated.tags) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, id), eq(documents.tenantId, user.tenantId)))
      .returning();

    if (!updated) {
      return errorResponse('Document not found', 'NOT_FOUND', 404);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update document:', error);
    return errorResponse('Failed to update document', 'DATABASE_ERROR', 500);
  }
}

// DELETE /api/documents/[id] - Delete a document and its stored file
export async function DELETE(
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

    // Fetch first so we have storage metadata for cleanup.
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.tenantId, user.tenantId)))
      .limit(1);

    if (!doc) {
      return errorResponse('Document not found', 'NOT_FOUND', 404);
    }

    // Delete the DB record first — if storage cleanup fails the record is
    // still gone and we don't leave a dangling row pointing at a dead file.
    await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.tenantId, user.tenantId)));

    // Best-effort storage cleanup. Log but don't fail the response — the
    // DB record is already gone and the client expects a 200.
    if (doc.storageKey) {
      deleteFile({
        provider: (doc.storageProvider as StorageProvider) || 'local',
        storageKey: doc.storageKey,
        sharepointLibraryId: doc.sharepointLibraryId,
      }).catch((err) =>
        console.error(`[document-delete] Storage cleanup failed for ${doc.storageKey}:`, err),
      );
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error('Failed to delete document:', error);
    return errorResponse('Failed to delete document', 'DATABASE_ERROR', 500);
  }
}