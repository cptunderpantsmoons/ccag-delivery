"use client";

import { useTheme } from "@/lib/theme/provider";
import { Sun, Moon, Monitor } from "lucide-react";

const options: { value: "light" | "dark" | "system"; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, resolved, setMode, isTransitioning } = useTheme();

  if (compact) {
    const active = options.find((o) => o.value === mode) ?? options[1];
    const Icon = active.icon;
    return (
      <button
        onClick={() => setMode(resolved === "dark" ? "light" : "dark")}
        disabled={isTransitioning}
        aria-label={`Toggle theme. Current: ${active.label}`}
        title={`Theme: ${active.label}`}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--deep)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
      >
        <Icon size={16} strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Theme selector"
      className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setMode(opt.value)}
            disabled={isTransitioning}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              active
                ? "bg-[var(--deep)] text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            } disabled:opacity-50`}
          >
            <Icon size={14} strokeWidth={1.5} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
