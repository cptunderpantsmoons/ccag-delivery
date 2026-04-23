import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { ingestDocument } from '@/lib/services/rag-vector-store';
import { getDocumentContent } from '@/lib/services/storage';

const ingestSchema = z.object({
  documentId: z.string().uuid(),
});

// POST /api/vector/ingest - Ingest a document into the vector store
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const result = ingestSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Invalid parameters', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    // Get the document
    const doc = await db.select()
      .from(documents)
      .where(and(
        eq(documents.id, result.data.documentId),
        eq(documents.tenantId, user.tenantId)
      ))
      .limit(1);

    if (!doc || doc.length === 0) {
      return errorResponse('Document not found', 'NOT_FOUND', 404);
    }

    const document = doc[0];

    // Get document content
    const content = await getDocumentContent(document);
    if (!content) {
      return errorResponse('Could not read document content', 'DOCUMENT_ERROR', 400);
    }

    // Ingest into vector store
    const ingestResult = await ingestDocument(
      user.tenantId,
      document,
      content
    );

    if (!ingestResult.success) {
      return errorResponse(ingestResult.error || 'Ingestion failed', 'INGESTION_ERROR', 500);
    }

    return NextResponse.json({
      success: true,
      documentId: result.data.documentId,
      chunksCreated: ingestResult.chunksCreated,
    });
  } catch (error) {
    console.error('Document ingestion failed:', error);
    return errorResponse('Ingestion failed', 'INGESTION_ERROR', 500);
  }
}
