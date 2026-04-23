import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { eq, desc, ilike, and, sql } from 'drizzle-orm';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth/current-user';
import { ensureUserUuid } from '@/lib/auth/ensure-user';
import { errorResponse } from '@/lib/api-errors';

// ============================================================
// Documents API - SharePoint-backed with PostgreSQL metadata
// ============================================================

const createDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  documentType: z.enum([
    'contract', 'legal_opinion', 'policy', 'template',
    'correspondence', 'nda', 'msa', 'sow', 'amendment', 'other',
  ]),
  fileName: z.string().min(1).max(500),
  fileSize: z.number().int().positive(),
  fileMimeType: z.string().min(1).max(100),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sharepointSiteId: z.string().optional(),
  sharepointLibraryId: z.string().optional(),
  sharepointItemId: z.string().optional(),
  sharepointWebUrl: z.string().optional(),
  sharepointETag: z.string().optional(),
  status: z.enum(['active', 'review', 'archived', 'draft']).default('active'),
});

// GET /api/documents - List documents with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Validate search parameter length
    if (search && search.length > 200) {
      return errorResponse('Search query too long (max 200 characters)', 'VALIDATION_ERROR', 400);
    }

    const conditions = [eq(documents.tenantId, user.tenantId)];

    if (documentType) {
      conditions.push(eq(documents.documentType, documentType as typeof documents.documentType.enumValues[number]));
    }
    if (status) {
      conditions.push(eq(documents.status, status));
    }
    if (search) {
      conditions.push(ilike(documents.title, `%${search}%`));
    }

    const whereClause = and(...conditions);

    const result = await db
      .select()
      .from(documents)
      .where(whereClause)
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documents)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: result,
      total: countResult[0]?.count ?? result.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return errorResponse('Failed to fetch documents', 'DATABASE_ERROR', 500);
  }
}

// POST /api/documents - Create a new document record
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const result = createDocumentSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation error', 'VALIDATION_ERROR', 400, result.error.flatten());
    }

    const validated = result.data;
    const userUuid = await ensureUserUuid(user);

    const [newDoc] = await db.insert(documents).values({
      ...validated,
      tags: validated.tags ? JSON.stringify(validated.tags) : null,
      tenantId: user.tenantId,
      uploadedBy: userUuid,
    }).returning();

    return NextResponse.json({ success: true, data: newDoc }, { status: 201 });
  } catch (error) {
    console.error('Failed to create document:', error);
    return errorResponse('Failed to create document', 'DATABASE_ERROR', 500);
  }
}

