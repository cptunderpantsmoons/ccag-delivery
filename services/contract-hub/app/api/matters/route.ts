import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { matters } from '@/lib/db/schema';
import { eq, desc, ilike, and, sql } from 'drizzle-orm';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth/current-user';
import { ensureUserUuid } from '@/lib/auth/ensure-user';
import { errorResponse } from '@/lib/api-errors';

// ============================================================
// Matters API - Legal matters and workflow tracking
// ============================================================

const createMatterSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'pending_review', 'closed', 'on_hold', 'cancelled']).default('open'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  matterType: z.string().max(100).optional(),
  assignedTo: z.string().uuid().optional(),
  dueDate: z.string().optional(),
});

// GET /api/matters - List matters with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Validate search parameter length
    if (search && search.length > 200) {
      return errorResponse('Search query too long (max 200 characters)', 'VALIDATION_ERROR', 400);
    }

    const conditions = [eq(matters.tenantId, user.tenantId)];

    if (status) {
      conditions.push(eq(matters.status, status as typeof matters.status.enumValues[number]));
    }
    if (priority) {
      conditions.push(eq(matters.priority, priority as typeof matters.priority.enumValues[number]));
    }
    if (search) {
      conditions.push(ilike(matters.title, `%${search}%`));
    }

    const whereClause = and(...conditions);

    const result = await db
      .select()
      .from(matters)
      .where(whereClause)
      .orderBy(desc(matters.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(matters)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: result,
      total: countResult[0]?.count ?? result.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch matters:', error);
    return errorResponse('Failed to fetch matters', 'DATABASE_ERROR', 500);
  }
}

// POST /api/matters - Create a new matter
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const result = createMatterSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation error', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    const validated = result.data;
    const userUuid = await ensureUserUuid(user);

    const [newMatter] = await db.insert(matters).values({
      tenantId: user.tenantId,
      title: validated.title,
      description: validated.description || null,
      status: validated.status ?? 'open',
      priority: validated.priority ?? 'medium',
      matterType: validated.matterType || null,
      assignedTo: validated.assignedTo || null,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      closedAt: null,
      createdBy: userUuid,
    }).returning();

    return NextResponse.json({ success: true, data: newMatter }, { status: 201 });
  } catch (error) {
    console.error('Failed to create matter:', error);
    return errorResponse('Failed to create matter', 'DATABASE_ERROR', 500);
  }
}

