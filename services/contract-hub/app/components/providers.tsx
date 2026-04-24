'use client';
import { ClerkProvider } from "@clerk/nextjs";

interface SafeProvidersProps {
  children: React.ReactNode;
}

function hasClerkKey(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  return key.startsWith("pk_") && key.length > 20;
}

export function SafeProviders({ children }: SafeProvidersProps) {
  if (!hasClerkKey()) {
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}
