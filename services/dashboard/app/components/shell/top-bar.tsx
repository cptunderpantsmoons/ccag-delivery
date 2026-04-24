"use client";

import { AuthUserButton } from "../auth-user-button";
import { Menu, Search } from "lucide-react";
import { ThemeToggle } from "../theme-toggle";

export function TopBar({
  title,
  onMenuClick,
}: {
  title: string;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] lg:hidden"
        >
          <Menu size={17} strokeWidth={1.5} />
        </button>
        <div className="flex flex-col">
          <h1 className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden md:block">
          <Search
            size={15}
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          />
          <input
            type="text"
            placeholder="Search..."
            className="carbon-input h-9 w-56 rounded-lg bg-[var(--deep)] pl-9 text-sm transition-colors focus:bg-[var(--surface)]"
          />
        </div>
        <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />
        <ThemeToggle compact />
        <AuthUserButton />
      </div>
    </header>
  );
}
