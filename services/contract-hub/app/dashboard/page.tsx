'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Upload,
  FileSignature,
  Briefcase,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Clock,
  FileText,
  CheckCircle2,
  FileCheck,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

interface StatItem {
  name: string;
  value: string;
  change: string;
  icon: string;
}

interface ActivityItem {
  id: number | string;
  type: string;
  action: string;
  description: string;
  time: string;
  status: string;
}

interface DashboardData {
  stats: StatItem[];
  recentActivity: ActivityItem[];
}

const quickActions: Array<{
  name: string;
  href: string;
  icon: LucideIcon;
  tileBg: string;
}> = [
  { name: 'Upload Document', href: '/dashboard/documents', icon: Upload, tileBg: 'bg-[var(--accent)]' },
  { name: 'New Contract', href: '/dashboard/contracts', icon: FileSignature, tileBg: 'bg-[var(--elevated)]' },
  { name: 'New Matter', href: '/dashboard/matters', icon: Briefcase, tileBg: 'bg-[var(--accent)]/80' },
  { name: 'AI Review', href: '/dashboard/ai', icon: Sparkles, tileBg: 'bg-[var(--accent-hover)]' },
];

const STAT_ICON_MAP: Record<string, LucideIcon> = {
  'Active Contracts': FileCheck,
  'Open Matters': Briefcase,
  'Pending Approvals': CheckCircle2,
  'Pending Reviews': FileText,
};

function resolveStatIcon(name: string): LucideIcon {
  return STAT_ICON_MAP[name] ?? FileText;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-AU');
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData({ stats: json.stats, recentActivity: json.recentActivity });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = data?.stats ?? [];
  const recentActivity = data?.recentActivity ?? [];

  return (
    <div className="space-y-12">
      <div className="reveal-section" style={{ '--section-delay': 0 } as React.CSSProperties}>
        <PageHeader
          eyebrow="Live Overview"
          title="Dashboard"
          description="Legal operations workspace — contract lifecycle, matter management, and AI-powered review."
        />
      </div>

      {/* Quick Actions */}
      <div className="reveal-section" style={{ '--section-delay': 1 } as React.CSSProperties}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.name}
                href={action.href}
                className="stagger-item group relative flex flex-col justify-between rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                style={{ '--index': index } as React.CSSProperties}
              >
                <div
                  className={cn(
                    'mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-rotate-3 group-hover:scale-110',
                    action.tileBg
                  )}
                >
                  <Icon className="h-6 w-6 text-white" strokeWidth={1.75} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.875rem] font-semibold text-[var(--text-primary)]">{action.name}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--deep)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:bg-[var(--accent)] group-hover:text-white">
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="reveal-section" style={{ '--section-delay': 2 } as React.CSSProperties}>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] p-6 md:col-span-2 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="skeleton h-10 w-10 rounded-xl" />
                <div className="skeleton h-5 w-12 rounded-full" />
              </div>
              <div className="skeleton mb-2 h-3 w-28 rounded" />
              <div className="skeleton h-10 w-16 rounded" />
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] p-5 lg:col-span-1"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="skeleton h-9 w-9 rounded-xl" />
                  <div className="skeleton h-5 w-10 rounded-full" />
                </div>
                <div className="skeleton mb-2 h-3 w-24 rounded" />
                <div className="skeleton h-7 w-12 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <AlertTriangle className="h-12 w-12 text-[var(--text-tertiary)]" strokeWidth={1} />
            <p className="text-[0.875rem] font-medium text-[var(--text-primary)]">
              Unable to load dashboard data
            </p>
            <p className="text-[0.8125rem] text-[var(--text-secondary)]">
              Please check your connection and try again
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {stats.length > 0 &&
              (() => {
                const primary = stats[0];
                const PrimaryIcon = resolveStatIcon(primary.name);
                const deltaUp = primary.change.startsWith('+');
                return (
                  <div className="stagger-item group relative rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] md:col-span-2 lg:col-span-2">
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-dim)]">
                        <PrimaryIcon className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
                      </div>
                      <Badge variant={deltaUp ? 'delta_up' : 'delta_down'}>{primary.change}</Badge>
                    </div>
                    <p className="mb-1 text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                      {primary.name}
                    </p>
                    <p className="font-mono text-[2.5rem] font-bold leading-none tabular-nums text-[var(--text-primary)]">
                      {primary.value}
                    </p>
                  </div>
                );
              })()}

            {stats.slice(1).map((stat, index) => {
              const Icon = resolveStatIcon(stat.name);
              const deltaUp = stat.change.startsWith('+');
              return (
                <div
                  key={stat.name}
                  className="stagger-item group relative rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] active:scale-[0.98]"
                  style={{ '--index': index + 1 } as React.CSSProperties}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--deep)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110">
                      <Icon className="h-4 w-4 text-[var(--text-secondary)]" strokeWidth={1.75} />
                    </div>
                    <Badge variant={deltaUp ? 'delta_up' : 'delta_down'}>{stat.change}</Badge>
                  </div>
                  <p className="mb-1 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                    {stat.name}
                  </p>
                  <p className="font-mono text-[1.5rem] font-bold leading-none tabular-nums text-[var(--text-primary)]">
                    {stat.value}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="reveal-section" style={{ '--section-delay': 3 } as React.CSSProperties}>
        <div className="relative rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
            <h2 className="text-[1rem] font-semibold tracking-tight text-[var(--text-primary)]">
              Recent Activity
            </h2>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--deep)] px-2.5 py-1">
              <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
              <span className="font-mono text-[0.6875rem] text-[var(--text-secondary)]">
                {loading ? '—' : `${recentActivity.length} events`}
              </span>
            </div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="skeleton h-2.5 w-2.5 flex-shrink-0 rounded-full" />
                    <div className="space-y-2">
                      <div className="skeleton h-3.5 w-40 rounded" />
                      <div className="skeleton h-3 w-56 rounded" />
                    </div>
                  </div>
                  <div className="skeleton ml-4 h-3 w-16 rounded" />
                </div>
              ))
            ) : recentActivity.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Clock className="h-12 w-12 text-[var(--text-tertiary)]" strokeWidth={1} />
                <p className="text-[0.875rem] font-medium text-[var(--text-primary)]">No recent activity</p>
                <p className="text-[0.8125rem] text-[var(--text-secondary)]">
                  Activity will appear here as you work
                </p>
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  className="stagger-item group flex items-center justify-between px-6 py-4 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[var(--deep)]"
                  style={{ '--index': index + 2 } as React.CSSProperties}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'h-2 w-2 flex-shrink-0 rounded-full transition-all duration-300',
                        activity.status === 'completed'
                          ? 'bg-[var(--accent)]'
                          : activity.status === 'in_progress'
                            ? 'bg-[var(--status-info)] ring-2 ring-[var(--status-info)]/20'
                            : 'animate-pulse border-2 border-[var(--status-warning)] bg-transparent'
                      )}
                    />
                    <div>
                      <p className="text-[0.875rem] font-medium text-[var(--text-primary)] transition-colors duration-300 group-hover:text-[var(--accent)]">
                        {activity.action}
                      </p>
                      <p className="max-w-[32ch] truncate text-[0.8125rem] text-[var(--text-secondary)]">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                  <span className="ml-4 whitespace-nowrap font-mono text-[0.75rem] text-[var(--text-tertiary)] opacity-60 transition-opacity duration-300 group-hover:opacity-100">
                    {formatRelativeTime(activity.time)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
