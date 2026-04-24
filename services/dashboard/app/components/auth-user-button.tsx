'use client';
import { UserButton } from "@clerk/nextjs";

interface AuthUserButtonProps {
  appearance?: Parameters<typeof UserButton>[0]["appearance"];
}

/**
 * SafeUserButton — renders a placeholder during static builds where ClerkProvider
 * is not active. Guards against the "UserButton can only be used within ClerkProvider"
 * error during Docker image builds when no real Clerk key is present.
 */
export function AuthUserButton({ appearance }: AuthUserButtonProps) {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const hasKey = key.startsWith("pk_") && key.length > 20;

  if (!hasKey) {
    // Build-time placeholder — renders a minimal avatar-sized box so layout
    // doesn't shift when the real button appears at runtime.
    return (
      <div
        aria-label="Sign in"
        style={{
          width: "2rem",
          height: "2rem",
          borderRadius: "0.625rem",
          border: "1px solid var(--border)",
          background: "var(--deep)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    );
  }

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-8 w-8 rounded-xl border border-[var(--border)]",
          ...appearance?.elements,
        },
      }}
    />
  );
}
