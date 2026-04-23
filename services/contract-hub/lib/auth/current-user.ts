import { auth, currentUser } from '@clerk/nextjs/server';

// ── Tenancy ────────────────────────────────────────────────────────────────
// MVP: every authenticated user belongs to a single shared tenant.
// The sentinel UUID '…0001' is stored in the tenants table by the first migration
// (see lib/db/migrations) so FK constraints are satisfied without any runtime
// provisioning step.  Set TENANT_ID to override — e.g. for white-label installs.
export const DEFAULT_TENANT_ID =
  process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export interface AuthContext {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
}

/**
 * Get the current authenticated user context for API routes.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthContext | null> {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }

  const user = await currentUser();
  
  return {
    userId: userId,
    tenantId: DEFAULT_TENANT_ID, // MVP: single tenant
    email: user?.emailAddresses?.[0]?.emailAddress || '',
    name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown User',
  };
}

/**
 * Helper to require authentication - throws/returns 401 response info if not authenticated.
 */
export async function requireAuth(): Promise<AuthContext> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
