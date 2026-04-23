import { db } from '@/lib/db';
import { auditEvents } from '@/lib/db/schema';

/**
 * Write an audit event to the database.
 * Fire-and-forget: errors are logged but do not propagate.
 */
export async function writeAuditEvent({
  tenantId,
  eventType,
  entityType,
  entityId,
  actorType = 'user',
  actorId,
  oldValue,
  newValue,
  ipAddress,
  userAgent,
}: {
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorType?: string;
  actorId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    await db.insert(auditEvents).values({
      tenantId,
      eventType,
      actorType,
      actorId: actorId || undefined,
      entityType,
      entityId,
      oldValue: oldValue || undefined,
      newValue: newValue || undefined,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    });
  } catch (error) {
    console.error(`Failed to write audit event [${eventType}]:`, error);
  }
}
