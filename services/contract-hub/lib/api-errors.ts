import { NextResponse } from 'next/server';

/**
 * Standardized error response helper for API routes.
 * Ensures consistent error format across all endpoints.
 */
export function errorResponse(error: string, code: string, status: number, details?: unknown) {
  const response: { error: string; code: string; details?: unknown } = { error, code };
  if (details) response.details = details;
  return NextResponse.json(response, { status });
}
