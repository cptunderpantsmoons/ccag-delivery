import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { integrationConnections } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';

// GET - List integration connections
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);

    const connections = await db.select().from(integrationConnections)
      .where(eq(integrationConnections.tenantId, user.tenantId))
      .orderBy(integrationConnections.createdAt);
    return NextResponse.json({ success: true, data: connections });
  } catch (err) {
    console.error('Failed to fetch integrations:', err);
    return NextResponse.json({ success: true, data: [] });
  }
}

// POST - Create integration connection
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    const body = await request.json();
    const schema = z.object({
      integrationType: z.enum(['sharepoint','outlook','docusign','docassemble','clio']),
      name: z.string().min(1).max(255),
      config: z.record(z.string(), z.unknown()),
    });
    const validated = schema.parse(body);
    const [newConn] = await db.insert(integrationConnections).values({
      tenantId: user.tenantId,
      integrationType: validated.integrationType,
      name: validated.name,
      config: validated.config,
      status: 'active',
    }).returning();
    return NextResponse.json({ success: true, data: newConn }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// PUT - Update integration connection
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);

    const body = await request.json();
    const schema = z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      config: z.record(z.string(), z.unknown()).optional(),
      status: z.enum(['active','inactive','error']).optional(),
    });
    const validated = schema.parse(body);
    // Tenant-scoped update — cannot modify another tenant's connection.
    const [updated] = await db.update(integrationConnections).set({
      ...(validated.name && { name: validated.name }),
      ...(validated.config && { config: validated.config }),
      ...(validated.status && { status: validated.status }),
      updatedAt: new Date(),
    }).where(and(
      eq(integrationConnections.id, validated.id),
      eq(integrationConnections.tenantId, user.tenantId),
    )).returning();
    if (!updated) return errorResponse('Not found', 'NOT_FOUND', 404);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// DELETE - Delete integration connection
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('id is required', 'VALIDATION_ERROR', 400);
    // Tenant-scoped delete — cannot delete another tenant's connection.
    const [deleted] = await db.delete(integrationConnections).where(and(
      eq(integrationConnections.id, id),
      eq(integrationConnections.tenantId, user.tenantId),
    )).returning();
    if (!deleted) return errorResponse('Not found', 'NOT_FOUND', 404);
    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}