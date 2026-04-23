/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window per IP + route key.
 *
 * For multi-instance deployments, replace with Redis (Upstash, etc.).
 */

interface LimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, LimitEntry>();
const WINDOW_MS = 60_000; // 1 minute

function getKey(ip: string, route: string): string {
  return `${ip}::${route}`;
}

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

// Periodic cleanup every 5 minutes
setInterval(cleanup, 5 * 60_000);

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function rateLimit(ip: string, route: string, maxRequests: number = 60): RateLimitResult {
  const key = getKey(ip, route);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + WINDOW_MS;
    store.set(key, { count: 1, resetAt });
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { success: false, limit: maxRequests, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, limit: maxRequests, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
