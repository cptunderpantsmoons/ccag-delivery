// Contract Hub — Anthropic / Claude OAuth Service
//
// All credentials are stored in the integrationConnections table and
// configured through the Settings UI — no environment variables required.
//
// DB config shape (integrationConnections.config):
// {
//   clientId:     string   — OAuth app client ID
//   clientSecret: string   — OAuth app client secret
//   redirectUri:  string   — must match the URI registered in console.anthropic.com
//   accessToken:  string?  — populated after successful OAuth flow
//   refreshToken: string?  — populated after successful OAuth flow
//   tokenType:    string?
//   expiresAt:    string?  — ISO 8601
// }
//
// Connection status values:
//   'configured' — credentials saved, not yet OAuth-authorised
//   'active'     — fully connected with an access token

import { db } from '@/lib/db';
import { integrationConnections } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import type { AIModelConfig } from '@/config/models';

const CLAUDE_AUTH_URL = 'https://claude.ai/oauth/authorize';
const CLAUDE_TOKEN_URL = 'https://claude.ai/oauth/token';
const ANTHROPIC_API_BASE = 'https://api.anthropic.com';
const ANTHROPIC_VERSION = '2023-06-01';

// ============================================================
// Public types
// ============================================================

export interface AnthropicAppCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface AnthropicModel {
  id: string;
  display_name: string;
  created_at: string;
  type: 'model';
}

export interface AnthropicTokens {
  access_token: string;
  refresh_token?: string | null;
  token_type: string;
  expires_in?: number | null;
  scope?: string | null;
}

// Internal — the full shape of what we store in integrationConnections.config
interface StoredConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  accessToken?: string;
  refreshToken?: string | null;
  tokenType?: string;
  expiresAt?: string | null;
}

// ============================================================
// DB helpers — credentials + token storage
// ============================================================

/** Load the full stored config row for this tenant, or null if none exists. */
async function getRow(tenantId: string) {
  const [row] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.tenantId, tenantId),
        eq(integrationConnections.integrationType, 'anthropic'),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Retrieve the OAuth app credentials entered by the user in Settings.
 * Returns null if credentials haven't been saved yet.
 */
export async function getAppCredentials(tenantId: string): Promise<AnthropicAppCredentials | null> {
  const row = await getRow(tenantId);
  const cfg = row?.config as StoredConfig | null;
  if (!cfg?.clientId || !cfg?.clientSecret || !cfg?.redirectUri) return null;
  return { clientId: cfg.clientId, clientSecret: cfg.clientSecret, redirectUri: cfg.redirectUri };
}

/**
 * Save (or update) the OAuth app credentials entered via the Settings UI.
 * Existing token fields are preserved so a re-save of credentials doesn't
 * invalidate an active OAuth session.
 */
export async function saveAppCredentials(
  tenantId: string,
  creds: AnthropicAppCredentials,
): Promise<void> {
  const row = await getRow(tenantId);
  const existing = (row?.config as StoredConfig | null) ?? {};

  const config: StoredConfig = { ...existing, ...creds };
  // Only mark active if we already have a valid token.
  const status = existing.accessToken ? 'active' : 'configured';

  if (row) {
    await db
      .update(integrationConnections)
      .set({ config, status, updatedAt: new Date() })
      .where(eq(integrationConnections.id, row.id));
  } else {
    await db.insert(integrationConnections).values({
      tenantId,
      integrationType: 'anthropic',
      name: 'Claude (Anthropic)',
      config,
      status: 'configured',
    });
  }
}

/**
 * Persist the OAuth tokens returned by Anthropic, merging with any existing
 * credential fields so clientId / clientSecret / redirectUri are not lost.
 */
export async function storeTokens(tenantId: string, tokens: AnthropicTokens): Promise<void> {
  const row = await getRow(tenantId);
  const existing = (row?.config as StoredConfig | null) ?? {};

  const config: StoredConfig = {
    ...existing,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    tokenType: tokens.token_type,
    expiresAt: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
  };

  if (row) {
    await db
      .update(integrationConnections)
      .set({ config, status: 'active', updatedAt: new Date() })
      .where(eq(integrationConnections.id, row.id));
  } else {
    await db.insert(integrationConnections).values({
      tenantId,
      integrationType: 'anthropic',
      name: 'Claude (Anthropic)',
      config,
      status: 'active',
    });
  }
}

/**
 * Retrieve the stored Bearer access token, or null if the tenant isn't connected.
 * Only returns a token when status is 'active'.
 */
export async function getAccessToken(tenantId: string): Promise<string | null> {
  const row = await getRow(tenantId);
  if (!row || row.status !== 'active') return null;
  return (row.config as StoredConfig | null)?.accessToken ?? null;
}

/** Returns the connection status for a tenant: 'none' | 'configured' | 'active'. */
export async function getConnectionStatus(
  tenantId: string,
): Promise<'none' | 'configured' | 'active'> {
  const row = await getRow(tenantId);
  if (!row) return 'none';
  return (row.status as 'configured' | 'active') ?? 'none';
}

// ============================================================
// OAuth URL + token exchange
// ============================================================

/**
 * Build the Anthropic authorization URL using credentials from the DB.
 * `creds` comes from `getAppCredentials()` — do not read env vars here.
 */
export function buildAuthorizationUrl(state: string, creds: AnthropicAppCredentials): string {
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    response_type: 'code',
    scope: 'openid',
    state,
  });
  return `${CLAUDE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens using DB-stored credentials.
 * `creds` comes from `getAppCredentials()`.
 */
export async function exchangeCodeForTokens(
  code: string,
  creds: AnthropicAppCredentials,
): Promise<AnthropicTokens> {
  const response = await fetch(CLAUDE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: creds.redirectUri,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic token exchange failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<AnthropicTokens>;
}

// ============================================================
// Model fetching + mapping
// ============================================================

/** Fetch Claude models from the Anthropic API using an active access token. */
export async function fetchClaudeModels(accessToken: string): Promise<AnthropicModel[]> {
  const response = await fetch(`${ANTHROPIC_API_BASE}/v1/models`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic models fetch failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return (data.data ?? []) as AnthropicModel[];
}

/**
 * Classify a Claude model into an AIModelConfig tier.
 *   haiku  → extraction
 *   opus   → analysis
 *   sonnet → review (default)
 */
export function claudeModelTier(modelId: string): AIModelConfig['tier'] {
  if (modelId.includes('haiku')) return 'extraction';
  if (modelId.includes('opus')) return 'analysis';
  return 'review';
}

/** Map Anthropic API model objects to the AIModelConfig shape used by the app. */
export function toAIModelConfigs(models: AnthropicModel[]): AIModelConfig[] {
  return models.map((m) => ({
    id: m.id,
    provider: 'anthropic',
    model: m.id,
    displayName: m.display_name,
    description: `Claude model — ${m.display_name}`,
    tier: claudeModelTier(m.id),
    maxTokens: 200_000,
    supportsStructuredOutput: true,
  }));
}
