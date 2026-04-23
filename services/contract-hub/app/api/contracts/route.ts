import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contracts } from '@/lib/db/schema';
import { eq, desc, ilike, and, sql } from 'drizzle-orm';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth/current-user';
import { ensureUserUuid } from '@/lib/auth/ensure-user';
import { errorResponse } from '@/lib/api-errors';

const createContractSchema = z.object({
  title: z.string().min(1).max(500),
  contractType: z.string().min(1).max(100),
  status: z.enum([
    'draft', 'review', 'negotiation', 'pending_approval',
    'approved', 'signed', 'active', 'expired', 'terminated', 'archived',
  ]).default('draft'),
  counterpartyName: z.string().min(1).max(500),
  counterpartyEmail: z.string().email().optional().or(z.literal('')),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  valueCurrency: z.string().max(3).default('AUD'),
  valueAmount: z.string().optional(),
  description: z.string().optional(),
  matterId: z.string().uuid().optional(),
  primaryDocumentId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
});

// GET /api/contracts - List contracts with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const contractType = searchParams.get('type');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Validate search parameter length
    if (search && search.length > 200) {
      return errorResponse('Search query too long (max 200 characters)', 'VALIDATION_ERROR', 400);
    }

    const conditions = [eq(contracts.tenantId, user.tenantId)];

    if (status) {
      conditions.push(eq(contracts.status, status as typeof contracts.status.enumValues[number]));
    }
    if (contractType) {
      conditions.push(eq(contracts.contractType, contractType));
    }
    if (search) {
      conditions.push(ilike(contracts.title, `%${search}%`));
    }

    const whereClause = and(...conditions);

    const result = await db
      .select()
      .from(contracts)
      .where(whereClause)
      .orderBy(desc(contracts.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contracts)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: result,
      total: countResult[0]?.count ?? result.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch contracts:', error);
    return errorResponse('Failed to fetch contracts', 'DATABASE_ERROR', 500);
  }
}

// POST /api/contracts - Create a new contract
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const result = createContractSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation error', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    const validated = result.data;
    const userUuid = await ensureUserUuid(user);

    const [newContract] = await db.insert(contracts).values({
      tenantId: user.tenantId,
      title: validated.title,
      contractType: validated.contractType,
      status: validated.status ?? 'draft',
      counterpartyName: validated.counterpartyName,
      counterpartyEmail: validated.counterpartyEmail || null,
      effectiveDate: validated.effectiveDate || null,
      expirationDate: validated.expirationDate || null,
      valueCurrency: validated.valueCurrency ?? 'AUD',
      valueAmount: validated.valueAmount || null,
      description: validated.description || null,
      matterId: validated.matterId || null,
      primaryDocumentId: validated.primaryDocumentId || null,
      assignedTo: validated.assignedTo || null,
      createdBy: userUuid,
    }).returning();

    return NextResponse.json({ success: true, data: newContract }, { status: 201 });
  } catch (error) {
    console.error('Failed to create contract:', error);
    return errorResponse('Failed to create contract', 'DATABASE_ERROR', 500);
  }
}

