import { auth } from "@clerk/nextjs/server";

const ORCHESTRATOR_URL = process.env.CARBON_ORCHESTRATOR_URL ?? "http://orchestrator:8000";

interface CacheEntry {
  key: string;
  expiresAt: number;
}

const apiKeyCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Exchange the current Clerk session token for a platform API key.
 * Caches per-userId to avoid repeated exchanges within the TTL.
 */
export async function getPlatformApiKey(): Promise<string | null> {
  const { userId, getToken } = await auth();
  if (!userId) return null;

  const cached = apiKeyCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key;
  }

  const clerkToken = await getToken();
  if (!clerkToken) return null;

  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/auth/get-api-key`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${clerkToken}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`[orchestrator-auth] get-api-key failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const apiKey = data.api_key as string | undefined;
    if (!apiKey) {
      console.error("[orchestrator-auth] get-api-key response missing api_key");
      return null;
    }

    apiKeyCache.set(userId, { key: apiKey, expiresAt: Date.now() + CACHE_TTL_MS });
    return apiKey;
  } catch (error) {
    console.error("[orchestrator-auth] exchange error:", error);
    return null;
  }
}

/**
 * Clear the cached API key for the current user (e.g., on rotation).
 */
export async function clearPlatformApiKey(): Promise<void> {
  const { userId } = await auth();
  if (userId) {
    apiKeyCache.delete(userId);
  }
}
