/**
 * Rate Limiter Utility
 * Implements a token bucket algorithm for API rate limiting
 */

interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds (default: 1 minute)
  maxRequests: number;   // Max requests per window (default: 60)
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

const DEFAULT_OPTIONS: RateLimitOptions = {
  windowMs: 60 * 1000,   // 1 minute
  maxRequests: 60,
};

export function rateLimit(
  key: string,
  options: Partial<RateLimitOptions> = {}
): RateLimitResult {
  const { windowMs = DEFAULT_OPTIONS.windowMs, maxRequests = DEFAULT_OPTIONS.maxRequests } = options;
  const now = Date.now();

  const record = rateLimitStore.get(key);
  const windowStart = now - windowMs;

  if (!record || record.windowStart < windowStart) {
    // Reset window
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Increment counter
  record.count++;
  rateLimitStore.set(key, record);

  // Check if limit exceeded
  if (record.count > maxRequests) {
    const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.windowStart + windowMs,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.windowStart + windowMs,
  };
}

/**
 * Clear rate limit for a specific key (useful for testing)
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
