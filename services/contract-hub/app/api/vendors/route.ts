import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendors } from '@/lib/db/schema';
import { eq, desc, ilike, and, sql } from 'drizzle-orm';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';

// ============================================================
// Vendors API - Outside counsel and legal service providers
// ============================================================

const createVendorSchema = z.object({
  name: z.string().min(1).max(500),
  vendorType: z.string().max(100).optional(),
  contactName: z.string().max(500).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  billingAddress: z.string().optional(),
  website: z.string().max(500).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

// GET /api/vendors - List vendors with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const vendorType = searchParams.get('type');
    const active = searchParams.get('active');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Validate search parameter length
    if (search && search.length > 200) {
      return errorResponse('Search query too long (max 200 characters)', 'VALIDATION_ERROR', 400);
    }

    const conditions = [eq(vendors.tenantId, user.tenantId)];
    if (vendorType) conditions.push(eq(vendors.vendorType, vendorType));
    if (active !== null) conditions.push(eq(vendors.isActive, active === 'true'));
    if (search) conditions.push(ilike(vendors.name, `%${search}%`));

    const whereClause = and(...conditions);

    const result = await db
      .select()
      .from(vendors)
      .where(whereClause)
      .orderBy(desc(vendors.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vendors)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: result,
      total: countResult[0]?.count ?? result.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch vendors:', error);
    return errorResponse('Failed to fetch vendors', 'DATABASE_ERROR', 500);
  }
}

// POST /api/vendors - Create a new vendor
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const result = createVendorSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation error', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    const validated = result.data;

    const [newVendor] = await db.insert(vendors).values({
      name: validated.name,
      vendorType: validated.vendorType || null,
      contactName: validated.contactName || null,
      contactEmail: validated.contactEmail || null,
      contactPhone: validated.contactPhone || null,
      billingAddress: validated.billingAddress || null,
      website: validated.website || null,
      notes: validated.notes || null,
      isActive: validated.isActive ?? true,
      tenantId: user.tenantId,
    }).returning();

    return NextResponse.json({ success: true, data: newVendor }, { status: 201 });
  } catch (error) {
    console.error('Failed to create vendor:', error);
    return errorResponse('Failed to create vendor', 'DATABASE_ERROR', 500);
  }
}

