import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { approvals } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth/current-user';
import { ensureUserUuid } from '@/lib/auth/ensure-user';
import { errorResponse } from '@/lib/api-errors';

// ============================================================
// Approvals API - Approval workflow management
// ============================================================

const createApprovalSchema = z.object({
  approvableType: z.enum(['contract', 'document', 'invoice']),
  approvableId: z.string().uuid(),
  comments: z.string().optional(),
});

// GET /api/approvals - List approvals with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const approvableType = searchParams.get('type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const conditions = [eq(approvals.tenantId, user.tenantId)];
    if (status) {
      conditions.push(eq(approvals.status, status as typeof approvals.status.enumValues[number]));
    }
    if (approvableType) conditions.push(eq(approvals.approvableType, approvableType));

    const whereClause = and(...conditions);

    const [result, countResult] = await Promise.all([
      db
        .select()
        .from(approvals)
        .where(whereClause)
        .orderBy(desc(approvals.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(approvals)
        .where(whereClause),
    ]);

    return NextResponse.json({
      success: true,
      data: result,
      total: countResult[0]?.count ?? result.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch approvals:', error);
    return errorResponse('Failed to fetch approvals', 'DATABASE_ERROR', 500);
  }
}

// POST /api/approvals - Create a new approval request
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const result = createApprovalSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation error', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    const validated = result.data;
    const userUuid = await ensureUserUuid(user);

    const [newApproval] = await db.insert(approvals).values({
      approvableType: validated.approvableType,
      approvableId: validated.approvableId,
      requestedBy: userUuid,
      comments: validated.comments || null,
      status: 'pending',
      tenantId: user.tenantId,
    }).returning();

    return NextResponse.json({ success: true, data: newApproval }, { status: 201 });
  } catch (error) {
    console.error('Failed to create approval:', error);
    return errorResponse('Failed to create approval', 'DATABASE_ERROR', 500);
  }
}

