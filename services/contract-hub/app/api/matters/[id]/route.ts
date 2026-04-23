import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { matters } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validation schema for matter updates
const updateMatterSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'pending_review', 'closed', 'on_hold', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  matterType: z.string().max(100).optional(),
  assignedTo: z.string().uuid().optional(),
  dueDate: z.string().optional(),
});

// GET /api/matters/[id]
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
    if (!UUID_RE.test(id)) return errorResponse('Invalid matter ID', 'VALIDATION_ERROR', 400);
    const [matter] = await db.select().from(matters).where(
      and(eq(matters.id, id), eq(matters.tenantId, user.tenantId))
    );
    if (!matter) return errorResponse('Matter not found', 'NOT_FOUND', 404);
    return NextResponse.json({ success: true, data: matter });
  } catch (error) {
    console.error('Failed to fetch matter:', error);
    return errorResponse('Failed to fetch matter', 'DATABASE_ERROR', 500);
  }
}

// PUT /api/matters/[id]
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
    if (!UUID_RE.test(id)) return errorResponse('Invalid matter ID', 'VALIDATION_ERROR', 400);
    const body = await request.json();

    const result = updateMatterSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Validation error', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    const validated = result.data;

    // Filter out undefined values to prevent NULL overwrites in database
    const cleanData: Record<string, unknown> = Object.fromEntries(
      Object.entries(validated).filter(([, value]) => value !== undefined)
    );

    // Convert dueDate string to Date object if present
    if (typeof cleanData.dueDate === 'string') {
      cleanData.dueDate = new Date(cleanData.dueDate);
    }

    const updates: Record<string, unknown> = { ...cleanData };
    if (validated.status === 'closed') {
      updates.closedAt = new Date();
    }

    const [updated] = await db.update(matters).set({ 
      ...updates, 
      updatedAt: new Date() 
    }).where(
      and(eq(matters.id, id), eq(matters.tenantId, user.tenantId))
    ).returning();
    if (!updated) return errorResponse('Matter not found', 'NOT_FOUND', 404);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update matter:', error);
    return errorResponse('Failed to update matter', 'DATABASE_ERROR', 500);
  }
}

// DELETE /api/matters/[id]
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
    if (!UUID_RE.test(id)) return errorResponse('Invalid matter ID', 'VALIDATION_ERROR', 400);
    const [deleted] = await db.delete(matters).where(
      and(eq(matters.id, id), eq(matters.tenantId, user.tenantId))
    ).returning();
    if (!deleted) return errorResponse('Matter not found', 'NOT_FOUND', 404);
    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    console.error('Failed to delete matter:', error);
    return errorResponse('Failed to delete matter', 'DATABASE_ERROR', 500);
  }
}