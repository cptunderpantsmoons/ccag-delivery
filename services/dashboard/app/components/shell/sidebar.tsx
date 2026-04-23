"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Leaf,
  Bot,
  CheckSquare,
  ShieldCheck,
  FileText,
  MessageSquare,
  Wrench,
  ListChecks,
  Columns3,
  User,
  ClipboardCheck,
  LayoutDashboard,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

type NavGroup = {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  items: NavItem[];
};

const hubItem: NavItem = { label: "Intelligence Hub", href: "/", icon: LayoutDashboard };

const navGroups: NavGroup[] = [
  {
    key: "agents",
    label: "Agents",
    icon: Bot,
    items: [
      { label: "Chat", href: "/agents/chat", icon: MessageSquare },
      { label: "Skills", href: "/agents/skills", icon: Wrench },
      { label: "Agent Queue", href: "/agents/queue", icon: ListChecks },
      { label: "Workspace", href: "/agents/workspace", icon: Columns3 },
    ],
  },
  {
    key: "tasks",
    label: "Tasks",
    icon: CheckSquare,
    items: [
      { label: "Task Board", href: "/tasks/board", icon: Columns3 },
      { label: "My Work", href: "/tasks/my-work", icon: User },
      { label: "Approvals", href: "/tasks/approvals", icon: ClipboardCheck },
    ],
  },
  {
    key: "documents",
    label: "Documents",
    icon: FileText,
    items: [
      { label: "Document Hub", href: "/documents", icon: FileText },
    ],
  },
];

const adminItem: NavItem = { label: "Admin", href: "/admin", icon: ShieldCheck };

function getInitialExpanded(pathname: string | null): Set<string> {
  const expanded = new Set<string>();
  if (pathname) {
    for (const group of navGroups) {
      if (group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))) {
        expanded.add(group.key);
      }
    }
  }
  return expanded;
}

export function Sidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Set<string>>(() => getInitialExpanded(pathname));

  function toggleGroup(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const isHubActive = pathname === "/";
  const isAdminActive = pathname === "/admin" || pathname?.startsWith("/admin/");

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[min(18rem,calc(100vw-2rem))] -translate-x-full flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-300 ease-[var(--ease-out-expo)] lg:static lg:z-auto lg:min-h-[100dvh] lg:w-64 lg:translate-x-0 ${
        mobileOpen ? "translate-x-0" : ""
      }`}
    >
      {/* Brand */}
      <div className="flex items-center gap-3.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--deep)]">
          <Leaf size={18} strokeWidth={1.5} className="text-[var(--accent)]" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            Carbon Hub
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            Intelligence
          </span>
        </div>
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onNavigate}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-tertiary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] lg:hidden"
        >
          <span aria-hidden="true" className="text-lg leading-none">&times;</span>
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {/* Hub link */}
        <Link
          href={hubItem.href}
          onClick={onNavigate}
          className={`group mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-[var(--duration-fast)] ${
            isHubActive
              ? "bg-[var(--accent-dim)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--deep)] hover:text-[var(--text-primary)]"
          }`}
        >
          <LayoutDashboard size={17} strokeWidth={1.5} className="shrink-0" />
          {hubItem.label}
          {isHubActive && (
            <span className="ml-auto h-1 w-1 rounded-full bg-[var(--accent)]" />
          )}
        </Link>
        <ul className="space-y-0.5">
          {navGroups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = expanded.has(group.key);
            const hasActiveChild = group.items.some(
              (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`)
            );

            return (
              <li key={group.key}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all duration-[var(--duration-fast)] ${
                    hasActiveChild
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  <GroupIcon size={16} strokeWidth={1.5} className="shrink-0 transition-colors" />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronRight
                    size={13}
                    strokeWidth={1.5}
                    className={`shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>

                {/* Collapsible items */}
                <div
                  className={`overflow-hidden transition-[max-height] duration-200 ease-[var(--ease-out-expo)] ${
                    isExpanded ? "max-h-96" : "max-h-0"
                  }`}
                >
                  <ul className="ml-[1.625rem] border-l border-[var(--border-subtle)] pl-2 pt-0.5 pb-1">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-[var(--duration-fast)] ${
                              isActive
                                ? "bg-[var(--accent-dim)] text-[var(--text-primary)]"
                                : "text-[var(--text-secondary)] hover:bg-[var(--deep)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            <ItemIcon size={14} strokeWidth={1.5} className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                            <span className="truncate">{item.label}</span>
                            {isActive && (
                              <span className="ml-auto h-1 w-1 rounded-full bg-[var(--accent)]" />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Standalone Admin */}
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <Link
            href={adminItem.href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-[var(--duration-fast)] ${
              isAdminActive
                ? "bg-[var(--accent-dim)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--deep)] hover:text-[var(--text-primary)]"
            }`}
          >
            <ShieldCheck size={17} strokeWidth={1.5} className="shrink-0" />
            {adminItem.label}
            {isAdminActive && (
              <span className="ml-auto h-1 w-1 rounded-full bg-[var(--accent)]" />
            )}
          </Link>
        </div>
      </nav>

      {/* Platform status */}
      <div className="border-t border-[var(--border)] px-5 py-4">
        <div className="label-mono mb-2">Platform Status</div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-success)] opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-success)]" />
          </span>
          All systems operational
        </div>
      </div>
    </aside>
  );
}
