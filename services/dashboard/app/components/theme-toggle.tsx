"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/app/lib/theme/provider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolved, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center rounded-lg p-2 text-[var(--text-tertiary)] transition-all duration-[var(--duration-fast)] hover:bg-[var(--deep)] hover:text-[var(--text-primary)] active:scale-95"
      title={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {resolved === "dark" ? (
        <Sun size={compact ? 16 : 17} strokeWidth={1.5} />
      ) : (
        <Moon size={compact ? 16 : 17} strokeWidth={1.5} />
      )}
    </button>
  );
}
