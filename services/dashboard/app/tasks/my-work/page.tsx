"use client";

import { useState } from "react";
import {
  CheckSquare,
  ClipboardCheck,
  Bot,
  CalendarClock,
  Bell,
  ChevronDown,
  Info,
} from "lucide-react";
import { AppShell } from "../../components/shell/app-shell";
import { PageHeader } from "../../components/ui";
import { StatCard } from "../../components/ui";
import { EmptyState } from "../../components/ui/empty-state";

// --- Types ---

interface Notification {
  id: string;
  icon: "document" | "task" | "approval" | "system";
  message: string;
  timestamp: string;
}

// --- Components ---

function CollapsibleSection({
  title,
  icon: Icon,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="carbon-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-[var(--space-md)] text-left transition-colors hover:bg-[var(--accent-dim)]"
      >
        <div className="flex items-center gap-[var(--space-md)]">
          <div className="flex size-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--deep)] text-[var(--accent)]">
            <Icon size={20} />
          </div>
          <div className="flex items-center gap-[var(--space-sm)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
            <span className="flex size-6 items-center justify-center rounded-full bg-[var(--accent-dim)] text-xs font-medium text-[var(--accent)]">
              {count}
            </span>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-[var(--text-tertiary)] transition-transform duration-[var(--duration-normal)] ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && <div className="border-t border-[var(--border)] p-[var(--space-md)]">{children}</div>}
    </div>
  );
}

function EmptySection({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-[var(--space-lg)] text-center">
      {icon}
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">No {title.toLowerCase()} yet</p>
      <p className="text-xs text-[var(--text-muted)]">Items will appear here once available.</p>
    </div>
  );
}

// --- Main Page ---

export default function MyWorkPage() {
  const [notifications] = useState<Notification[]>([]);

  return (
    <AppShell title="My Work">
      <div className="mx-auto max-w-6xl space-y-[var(--space-xl)]">
        <PageHeader
          title="My Work"
          breadcrumbs={[{ label: "Tasks", href: "/tasks" }, { label: "My Work" }]}
        />

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tasks Due Today" value="—" />
          <StatCard label="Pending Approvals" value="—" />
          <StatCard label="Agent Outputs to Review" value="—" />
          <StatCard label="Meetings Today" value="—" />
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-[var(--space-md)]">
          <CollapsibleSection title="Tasks Due Today" icon={CheckSquare} count={0}>
            <EmptySection icon={<CheckSquare size={32} className="text-[var(--text-muted)]" />} title="tasks" />
          </CollapsibleSection>

          <CollapsibleSection title="Pending Approvals" icon={ClipboardCheck} count={0}>
            <EmptySection icon={<ClipboardCheck size={32} className="text-[var(--text-muted)]" />} title="approvals" />
          </CollapsibleSection>

          <CollapsibleSection title="Agent Outputs" icon={Bot} count={0}>
            <EmptySection icon={<Bot size={32} className="text-[var(--text-muted)]" />} title="agent outputs" />
          </CollapsibleSection>

          <CollapsibleSection title="Today's Meetings" icon={CalendarClock} count={0}>
            <EmptySection icon={<CalendarClock size={32} className="text-[var(--text-muted)]" />} title="meetings" />
          </CollapsibleSection>

          <CollapsibleSection title="Notifications" icon={Bell} count={notifications.length}>
            <div className="space-y-[var(--space-sm)]">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div key={notification.id}>{notification.message}</div>
                ))
              ) : (
                <EmptyState
                  icon={<Info size={32} />}
                  title="No new notifications"
                  description="Notifications will appear here when available."
                />
              )}
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </AppShell>
  );
}
