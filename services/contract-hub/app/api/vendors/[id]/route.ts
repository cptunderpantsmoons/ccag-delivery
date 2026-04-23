import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const updateVendorSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  vendorType: z.string().max(100).optional(),
  contactName: z.string().max(500).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  billingAddress: z.string().optional(),
  website: z.string().max(500).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/vendors/[id]
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
    if (!UUID_RE.test(id)) return errorResponse('Invalid vendor ID', 'VALIDATION_ERROR', 400);
    const [vendor] = await db.select().from(vendors).where(
      and(eq(vendors.id, id), eq(vendors.tenantId, user.tenantId))
    );
    if (!vendor) return errorResponse('Vendor not found', 'NOT_FOUND', 404);
    return NextResponse.json({ success: true, data: vendor });
  } catch (error) {
    console.error('Failed to fetch vendor:', error);
    return errorResponse('Failed to fetch vendor', 'DATABASE_ERROR', 500);
  }
}

// PUT /api/vendors/[id]
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
    if (!UUID_RE.test(id)) return errorResponse('Invalid vendor ID', 'VALIDATION_ERROR', 400);
    const body = await request.json();
    const result = updateVendorSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Validation error', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    const validated = result.data;
    const cleanData = Object.fromEntries(
      Object.entries(validated).filter(([, value]) => value !== undefined)
    );

    const [updated] = await db.update(vendors).set({ ...cleanData, updatedAt: new Date() }).where(
      and(eq(vendors.id, id), eq(vendors.tenantId, user.tenantId))
    ).returning();
    if (!updated) return errorResponse('Vendor not found', 'NOT_FOUND', 404);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update vendor:', error);
    return errorResponse('Failed to update vendor', 'DATABASE_ERROR', 500);
  }
}

// DELETE /api/vendors/[id]
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
    if (!UUID_RE.test(id)) return errorResponse('Invalid vendor ID', 'VALIDATION_ERROR', 400);
    const [deleted] = await db.delete(vendors).where(
      and(eq(vendors.id, id), eq(vendors.tenantId, user.tenantId))
    ).returning();
    if (!deleted) return errorResponse('Vendor not found', 'NOT_FOUND', 404);
    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    console.error('Failed to delete vendor:', error);
    return errorResponse('Failed to delete vendor', 'DATABASE_ERROR', 500);
  }
}