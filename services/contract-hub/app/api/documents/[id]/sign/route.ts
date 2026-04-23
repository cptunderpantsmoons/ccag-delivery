/**
 * Document Signature API
 * Handles document signing with audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auditEvents, documents } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/current-user';
import { ensureUserUuid } from '@/lib/auth/ensure-user';
import { errorResponse } from '@/lib/api-errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth before touching the body.
    const authUser = await getCurrentUser();
    if (!authUser) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);

    const { id: documentId } = await params;
    if (!UUID_RE.test(documentId)) return errorResponse('Invalid document ID', 'VALIDATION_ERROR', 400);

    const body = await request.json();
    const { signatureDataUrl } = body;
    if (!signatureDataUrl) return errorResponse('Missing signature data', 'VALIDATION_ERROR', 400);

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const actorUuid = await ensureUserUuid(authUser);

    const [event] = await db
      .insert(auditEvents)
      .values({
        tenantId: authUser.tenantId,
        entityType: 'document',
        entityId: documentId,
        actorId: actorUuid,
        ipAddress,
        eventType: 'document_signed',
        newValue: {},
        oldValue: {},
      })
      .returning();

    await db
      .update(documents)
      .set({ status: 'signed' })
      .where(and(
        eq(documents.id, documentId),
        eq(documents.tenantId, authUser.tenantId),
      ));

    return NextResponse.json({
      success: true,
      data: {
        signatureId: event.id,
        signedAt: new Date().toISOString(),
        ipAddress,
        documentId,
      },
    });
  } catch (error) {
    console.error('Signature error:', error);
    return errorResponse('Failed to sign document', 'DATABASE_ERROR', 500);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);

    const { id: documentId } = await params;
    if (!UUID_RE.test(documentId)) return errorResponse('Invalid document ID', 'VALIDATION_ERROR', 400);

    // Filter to signature events only — the full audit trail lives at /audit.
    const signatures = await db
      .select()
      .from(auditEvents)
      .where(and(
        eq(auditEvents.entityId, documentId),
        eq(auditEvents.tenantId, authUser.tenantId),
        eq(auditEvents.eventType, 'document_signed'),
      ))
      .orderBy(desc(auditEvents.createdAt));

    return NextResponse.json({ success: true, data: { signatures } });
  } catch (error) {
    console.error('Failed to fetch signatures:', error);
    return errorResponse('Failed to fetch signatures', 'DATABASE_ERROR', 500);
  }
}
