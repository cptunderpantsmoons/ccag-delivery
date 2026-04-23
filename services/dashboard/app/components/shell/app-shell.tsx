"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative flex min-h-[100dvh] overflow-x-hidden bg-[var(--background)]">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity lg:hidden"
        />
      )}

      <Sidebar
        mobileOpen={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          title={title}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
