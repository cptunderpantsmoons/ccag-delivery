import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, tenants } from '@/lib/db/schema';
import type { AuthContext } from '@/lib/auth/current-user';

// Deterministic Clerk ID -> UUID (v4-shaped, stable per Clerk ID).
export function clerkIdToUuid(clerkId: string): string {
  const h = createHash('sha256').update(clerkId).digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    '4' + h.slice(13, 16),
    '8' + h.slice(17, 20),
    h.slice(20, 32),
  ].join('-');
}

// Process-local cache to skip redundant DB lookups within the same server instance.
// This is a performance optimisation ONLY — it is ephemeral and will be empty after
// a cold start (serverless / new container). The real race-condition guard is the
// onConflictDoNothing() below. Do NOT remove that just because this cache exists.
const cache = new Set<string>();

// Ensures a users row exists for the Clerk user; returns its UUID.
export async function ensureUserUuid(ctx: AuthContext): Promise<string> {
  const uuid = clerkIdToUuid(ctx.userId);
  if (cache.has(uuid)) return uuid;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, uuid));
  if (!existing) {
    // Ensure tenant row exists (FK target) before inserting user.
    await db.insert(tenants).values({
      id: ctx.tenantId,
      name: 'Default Tenant',
      slug: 'default',
    }).onConflictDoNothing();

    await db.insert(users).values({
      id: uuid,
      tenantId: ctx.tenantId,
      email: ctx.email || `${ctx.userId}@unknown.local`,
      name: ctx.name || 'Unknown User',
    }).onConflictDoNothing();
  }
  cache.add(uuid);
  return uuid;
}
