// GET /api/ai/claude-models
// Returns the list of Claude models available for the authenticated tenant.
// Requires an active Anthropic OAuth connection stored in integrationConnections.
// Returns an empty array (not an error) when Anthropic is not connected, so the
// settings page can render without Claude options rather than blowing up.

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { getAccessToken, fetchClaudeModels, toAIModelConfigs } from '@/lib/services/anthropic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);

  const accessToken = await getAccessToken(user.tenantId);

  // Not connected — return empty list so callers don't need to special-case.
  if (!accessToken) {
    return NextResponse.json({ success: true, connected: false, models: [] });
  }

  try {
    const raw = await fetchClaudeModels(accessToken);
    const models = toAIModelConfigs(raw);
    return NextResponse.json({ success: true, connected: true, models });
  } catch (err) {
    console.error('[claude-models] Failed to fetch from Anthropic:', err);
    // Surface the error but don't crash the page — the token may have expired.
    return NextResponse.json({
      success: false,
      connected: true,
      models: [],
      error: err instanceof Error ? err.message : 'Failed to fetch Claude models',
    });
  }
}
