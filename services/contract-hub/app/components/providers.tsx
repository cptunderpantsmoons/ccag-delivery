'use client';
import { ClerkProvider } from "@clerk/nextjs";

interface SafeProvidersProps {
  children: React.ReactNode;
}

function hasClerkKey(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  // Real keys are substantially longer than "pk_build_placeholder"
  return key.startsWith("pk_") && key.length > 30;
}

export function SafeProviders({ children }: SafeProvidersProps) {
  if (!hasClerkKey()) {
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}
