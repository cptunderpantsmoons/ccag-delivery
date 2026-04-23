import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contracts, matters, approvals, documents, auditEvents } from '@/lib/db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';

// Icon SVG paths for each stat card
const STAT_ICONS = [
  'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
];

const EMPTY_STATS = [
  { name: 'Active Contracts', value: '0', change: '+0', icon: STAT_ICONS[0] },
  { name: 'Open Matters', value: '0', change: '+0', icon: STAT_ICONS[1] },
  { name: 'Pending Approvals', value: '0', change: '+0', icon: STAT_ICONS[2] },
  { name: 'Pending Reviews', value: '0', change: '+0', icon: STAT_ICONS[3] },
];

// GET /api/dashboard - Aggregate stats and recent activity
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    // Run all count queries in parallel with tenant isolation
    const [
      contractCount,
      matterCount,
      pendingApprovalCount,
      reviewDocCount,
      recentEvents,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(contracts)
        .where(and(
          eq(contracts.status, 'active'),
          eq(contracts.tenantId, user.tenantId)
        )),

      db.select({ count: sql<number>`count(*)::int` })
        .from(matters)
        .where(and(
          eq(matters.status, 'open'),
          eq(matters.tenantId, user.tenantId)
        )),

      db.select({ count: sql<number>`count(*)::int` })
        .from(approvals)
        .where(and(
          eq(approvals.status, 'pending'),
          eq(approvals.tenantId, user.tenantId)
        )),

      db.select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(and(
          eq(documents.status, 'review'),
          eq(documents.tenantId, user.tenantId)
        )),

      db.select()
        .from(auditEvents)
        .where(and(
          eq(auditEvents.tenantId, user.tenantId)
        ))
        .orderBy(desc(auditEvents.createdAt))
        .limit(10),
    ]);

    const counts = [
      contractCount[0]?.count ?? 0,
      matterCount[0]?.count ?? 0,
      pendingApprovalCount[0]?.count ?? 0,
      reviewDocCount[0]?.count ?? 0,
    ];

    const stats = EMPTY_STATS.map((base, i) => ({
      ...base,
      value: String(counts[i]),
    }));

    const recentActivity = recentEvents.map((event) => ({
      id: event.id,
      type: event.entityType || 'system',
      action: event.eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: (event.newValue as Record<string, string>)?.title
        || (event.oldValue as Record<string, string>)?.title
        || (event.newValue as Record<string, string>)?.details
        || event.entityType || '',
      time: event.createdAt.toISOString(),
      status: 'completed',
    }));

    return NextResponse.json({ success: true, stats, recentActivity });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    // Return sensible defaults instead of a 500 error
    return NextResponse.json({
      success: true,
      stats: EMPTY_STATS,
      recentActivity: [],
    });
  }
}
