/**
 * Document Audit Trail API
 * Returns complete audit history for a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditEvents } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    // Fetch from database with tenant isolation
    const events = await db
      .select()
      .from(auditEvents)
      .where(and(
        eq(auditEvents.entityId, documentId),
        eq(auditEvents.tenantId, user.tenantId)
      ))
      .orderBy(desc(auditEvents.createdAt));

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Failed to fetch audit trail:', error);
    return errorResponse('Failed to fetch audit trail', 'DATABASE_ERROR', 500);
  }
}
