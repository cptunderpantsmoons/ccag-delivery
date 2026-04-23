import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contracts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validation schema for contract updates
const updateContractSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  contractType: z.string().max(100).optional(),
  status: z.enum([
    'draft', 'review', 'negotiation', 'pending_approval',
    'approved', 'signed', 'active', 'expired', 'terminated', 'archived'
  ]).optional(),
  counterpartyName: z.string().max(500).optional(),
  counterpartyEmail: z.string().email().max(255).optional().or(z.literal('')),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  valueCurrency: z.string().length(3).optional(),
  valueAmount: z.string().optional(),
  description: z.string().optional(),
  matterId: z.string().uuid().optional(),
  primaryDocumentId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
});

// GET /api/contracts/[id] - Get a single contract by ID
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
      return errorResponse('Invalid contract ID', 'VALIDATION_ERROR', 400);
    }

    const [contract] = await db.select().from(contracts).where(
      and(eq(contracts.id, id), eq(contracts.tenantId, user.tenantId))
    );
    if (!contract) {
      return errorResponse('Contract not found', 'NOT_FOUND', 404);
    }
    return NextResponse.json({ success: true, data: contract });
  } catch (error) {
    console.error('Failed to fetch contract:', error);
    return errorResponse('Failed to fetch contract', 'DATABASE_ERROR', 500);
  }
}

// PUT /api/contracts/[id] - Update a contract
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

    if (!UUID_RE.test(id)) {
      return errorResponse('Invalid contract ID', 'VALIDATION_ERROR', 400);
    }

    const body = await request.json();

    const result = updateContractSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Validation error', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    const validated = result.data;

    // Filter out undefined values to prevent NULL overwrites in database
    const cleanData = Object.fromEntries(
      Object.entries(validated).filter(([, value]) => value !== undefined)
    );

    const [updated] = await db
      .update(contracts)
      .set({ ...cleanData, updatedAt: new Date() })
      .where(and(eq(contracts.id, id), eq(contracts.tenantId, user.tenantId)))
      .returning();

    if (!updated) {
      return errorResponse('Contract not found', 'NOT_FOUND', 404);
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update contract:', error);
    return errorResponse('Failed to update contract', 'DATABASE_ERROR', 500);
  }
}

// DELETE /api/contracts/[id] - Delete a contract
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
      return errorResponse('Invalid contract ID', 'VALIDATION_ERROR', 400);
    }

    const [deleted] = await db.delete(contracts).where(
      and(eq(contracts.id, id), eq(contracts.tenantId, user.tenantId))
    ).returning();
    if (!deleted) {
      return errorResponse('Contract not found', 'NOT_FOUND', 404);
    }
    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    console.error('Failed to delete contract:', error);
    return errorResponse('Failed to delete contract', 'DATABASE_ERROR', 500);
  }
}