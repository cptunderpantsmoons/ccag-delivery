// GET /api/auth/claude/callback
// Handles the Anthropic OAuth redirect. Validates CSRF state, loads the
// stored app credentials from DB to exchange the code for tokens, then
// persists the tokens and redirects back to Settings.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import {
  getAppCredentials,
  exchangeCodeForTokens,
  storeTokens,
} from '@/lib/services/anthropic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');
  const oauthErrorDesc = searchParams.get('error_description');

  const settingsUrl = new URL('/dashboard/settings', request.url);

  if (oauthError) {
    settingsUrl.searchParams.set('claude_error', oauthError);
    if (oauthErrorDesc) settingsUrl.searchParams.set('claude_error_desc', oauthErrorDesc);
    return clearStateAndRedirect(request, settingsUrl);
  }

  if (!code || !state) {
    settingsUrl.searchParams.set('claude_error', 'missing_params');
    return clearStateAndRedirect(request, settingsUrl);
  }

  // CSRF check.
  const storedState = request.cookies.get('claude_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    settingsUrl.searchParams.set('claude_error', 'state_mismatch');
    return clearStateAndRedirect(request, settingsUrl);
  }

  const user = await getCurrentUser();
  if (!user) {
    settingsUrl.searchParams.set('claude_error', 'session_expired');
    return clearStateAndRedirect(request, settingsUrl);
  }

  // Load app credentials from DB — no env vars.
  const creds = await getAppCredentials(user.tenantId);
  if (!creds) {
    settingsUrl.searchParams.set('claude_error', 'credentials_missing');
    return clearStateAndRedirect(request, settingsUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, creds);
    await storeTokens(user.tenantId, tokens);
    settingsUrl.searchParams.set('claude_connected', '1');
  } catch (err) {
    console.error('[claude-oauth] Token exchange failed:', err);
    settingsUrl.searchParams.set('claude_error', 'token_exchange_failed');
  }

  return clearStateAndRedirect(request, settingsUrl);
}

function clearStateAndRedirect(request: NextRequest, target: URL): NextResponse {
  const response = NextResponse.redirect(target);
  response.cookies.set('claude_oauth_state', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
