import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { approvals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth/current-user';
import { ensureUserUuid } from '@/lib/auth/ensure-user';
import { errorResponse } from '@/lib/api-errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const approveSchema = z.object({
  action: z.enum(['approve', 'reject']),
  comments: z.string().optional(),
});

// GET /api/approvals/[id]
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
    if (!UUID_RE.test(id)) return errorResponse('Invalid approval ID', 'VALIDATION_ERROR', 400);
    const [approval] = await db.select().from(approvals).where(
      and(eq(approvals.id, id), eq(approvals.tenantId, user.tenantId))
    );
    if (!approval) return errorResponse('Approval not found', 'NOT_FOUND', 404);
    return NextResponse.json({ success: true, data: approval });
  } catch (error) {
    console.error('Failed to fetch approval:', error);
    return errorResponse('Failed to fetch approval', 'DATABASE_ERROR', 500);
  }
}

// PUT /api/approvals/[id] - Approve or reject an approval
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
    if (!UUID_RE.test(id)) return errorResponse('Invalid approval ID', 'VALIDATION_ERROR', 400);
    const body = await request.json();
    const result = approveSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation error', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    const validated = result.data;
    const newStatus = validated.action === 'approve' ? 'approved' : 'rejected';
    const userUuid = await ensureUserUuid(user);

    const [updated] = await db
      .update(approvals)
      .set({
        status: newStatus,
        approvedBy: userUuid,
        comments: validated.comments || null,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(approvals.id, id), eq(approvals.tenantId, user.tenantId)))
      .returning();

    if (!updated) return errorResponse('Approval not found', 'NOT_FOUND', 404);

    return NextResponse.json({
      success: true,
      data: updated,
      message: validated.action === 'approve'
        ? 'Approval granted successfully'
        : 'Approval rejected',
    });
  } catch (error) {
    console.error('Failed to update approval:', error);
    return errorResponse('Failed to update approval', 'DATABASE_ERROR', 500);
  }
}

// DELETE /api/approvals/[id] - Cancel a pending approval
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
    if (!UUID_RE.test(id)) return errorResponse('Invalid approval ID', 'VALIDATION_ERROR', 400);

    // Fetch first to check current status — only 'pending' approvals may be cancelled.
    const [existing] = await db
      .select({ status: approvals.status })
      .from(approvals)
      .where(and(eq(approvals.id, id), eq(approvals.tenantId, user.tenantId)))
      .limit(1);

    if (!existing) return errorResponse('Approval not found', 'NOT_FOUND', 404);
    if (existing.status !== 'pending') {
      return errorResponse(
        `Cannot cancel an approval with status '${existing.status}'`,
        'CONFLICT',
        409,
      );
    }

    const [cancelled] = await db
      .update(approvals)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(approvals.id, id), eq(approvals.tenantId, user.tenantId)))
      .returning();

    return NextResponse.json({ success: true, data: cancelled, message: 'Approval cancelled' });
  } catch (error) {
    console.error('Failed to cancel approval:', error);
    return errorResponse('Failed to cancel approval', 'DATABASE_ERROR', 500);
  }
}