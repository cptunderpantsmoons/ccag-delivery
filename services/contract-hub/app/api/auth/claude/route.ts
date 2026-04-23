// GET /api/auth/claude
// Starts the Anthropic OAuth 2.0 flow using credentials stored in the DB
// (entered by the user in Settings — no env vars required).

import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { getAppCredentials, buildAuthorizationUrl } from '@/lib/services/anthropic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);

  const creds = await getAppCredentials(user.tenantId);
  if (!creds) {
    return errorResponse(
      'Anthropic credentials are not configured. Enter your Client ID, Client Secret, and Redirect URI in Settings first.',
      'NOT_CONFIGURED',
      422,
    );
  }

  const state = randomBytes(32).toString('hex');
  const authUrl = buildAuthorizationUrl(state, creds);

  const response = NextResponse.redirect(authUrl);

  // Short-lived HttpOnly cookie for CSRF state validation on callback.
  response.cookies.set('claude_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  return response;
}
