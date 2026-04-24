'use client';
// SafeProviders wraps ClerkProvider — only renders when a real Clerk key is
// present (detected at runtime). During Docker builds where no real key is
// available yet, ClerkProvider is skipped so static page generation can proceed.

import { ClerkProvider } from "@clerk/nextjs";

interface SafeProvidersProps {
  children: React.ReactNode;
}

/**
 * Returns true when a real Clerk publishable key is detected.
 * During Docker build the key is unset → returns false.
 * At runtime with a real deployment key it returns true.
 */
function hasClerkKey(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  // Real keys start with "pk_" and are substantially longer than a placeholder.
  return key.startsWith("pk_") && key.length > 20;
}

export function SafeProviders({ children }: SafeProvidersProps) {
  if (!hasClerkKey()) {
    // No real Clerk key — skip ClerkProvider during static build so pages
    // that use auth-dependent components don't crash prerender.
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}
