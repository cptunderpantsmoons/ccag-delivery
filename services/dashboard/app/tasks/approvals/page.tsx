"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ClipboardCheck,
  FileText,
  MessageSquare,
  Receipt,
  RefreshCw,
  Shield,
  Bot,
  X,
  Send,
  User,
} from "lucide-react";
import { AppShell } from "@/app/components/shell/app-shell";
import { PageHeader } from "@/app/components/ui/page-header";
import { StatCard } from "@/app/components/ui/stat-card";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { EmptyState } from "@/app/components/ui/empty-state";
import { CardGrid } from "@/app/components/ui/card-grid";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ApprovalStatus = "Pending" | "Approved" | "Rejected" | "In Progress";
type ApprovalType = "Invoice" | "Contract" | "Policy Change" | "Agent Action";
type Urgency = "Urgent" | "Normal";

interface ApprovalStep {
  name: string;
  status: "completed" | "active" | "pending";
}

interface Comment {
  id: string;
  author: string;
  avatar?: string;
  text: string;
  timestamp: string;
}

interface ApprovalItem {
  id: string;
  title: string;
  subtitle?: string;
  requestor: string;
  requestorAvatar?: string;
  submittedDate: string;
  type: ApprovalType;
  status: ApprovalStatus;
  urgency: Urgency;
  steps: ApprovalStep[];
  comments: Comment[];
}

/* ------------------------------------------------------------------ */
/*  Static maps                                                        */
/* ------------------------------------------------------------------ */

const statusBadgeMap: Record<
  ApprovalStatus,
  { status: "warning" | "success" | "error" | "info"; label: string }
> = {
  Pending: { status: "warning", label: "Pending" },
  Approved: { status: "success", label: "Approved" },
  Rejected: { status: "error", label: "Rejected" },
  "In Progress": { status: "info", label: "In Progress" },
};

const typeIconMap: Record<ApprovalType, React.ReactNode> = {
  Invoice: <Receipt size={18} />,
  Contract: <FileText size={18} />,
  "Policy Change": <Shield size={18} />,
  "Agent Action": <Bot size={18} />,
};

const typeColorMap: Record<ApprovalType, string> = {
  Invoice: "text-[var(--status-info)]",
  Contract: "text-[var(--status-warning)]",
  "Policy Change": "text-[var(--status-success)]",
  "Agent Action": "text-[var(--text-secondary)]",
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ApprovalChain({ steps }: { steps: ApprovalStep[] }) {
  if (!steps || steps.length === 0) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((step, i) => (
        <span key={i} className="flex items-center gap-1">
          <span
            className={`text-xs font-medium ${
              step.status === "completed"
                ? "text-[var(--status-success)]"
                : step.status === "active"
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-muted)]"
            }`}
          >
            {step.name}
          </span>
          {i < steps.length - 1 && (
            <span className="text-[var(--text-muted)] text-xs">→</span>
          )}
        </span>
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--deep)] text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border)]">
      {initials || <User size={14} />}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="carbon-card p-[var(--space-lg)]">
      <div className="flex flex-col gap-[var(--space-md)]">
        <div className="flex items-start gap-[var(--space-md)]">
          <div className="skeleton h-5 w-5 shrink-0 rounded" />
          <div className="flex flex-col gap-[var(--space-xs)] flex-1">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
          </div>
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
        <div className="skeleton h-8 w-full rounded-md" />
      </div>
    </div>
  );
}

function ApprovalCard({
  item,
  onAction,
}: {
  item: ApprovalItem;
  onAction: (
    id: string,
    action: "approve" | "reject" | "request_changes",
    comment: string
  ) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>(item.comments ?? []);
  const [submitting, setSubmitting] = useState(false);

  const badge = statusBadgeMap[item.status] ?? statusBadgeMap.Pending;
  const isPending =
    item.status === "Pending" || item.status === "In Progress";

  const handleAction = async (
    action: "approve" | "reject" | "request_changes"
  ) => {
    setSubmitting(true);
    try {
      await onAction(item.id, action, newComment.trim());
      if (newComment.trim()) {
        setComments((prev) => [
          ...prev,
          {
            id: `c-${Date.now()}`,
            author: "You",
            text: newComment.trim(),
            timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
          },
        ]);
        setNewComment("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="carbon-card p-[var(--space-lg)]">
      <div className="flex flex-col gap-[var(--space-md)]">
        {/* Top row */}
        <div className="flex items-start justify-between gap-[var(--space-md)]">
          <div className="flex items-start gap-[var(--space-md)] min-w-0">
            <div
              className={`mt-0.5 shrink-0 ${typeColorMap[item.type] ?? ""}`}
            >
              {typeIconMap[item.type] ?? <FileText size={18} />}
            </div>
            <div className="flex flex-col gap-[var(--space-xs)] min-w-0">
              <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-snug">
                {item.title}
              </h3>
              {item.subtitle && (
                <span className="text-sm text-[var(--text-secondary)]">
                  {item.subtitle}
                </span>
              )}
              <div className="flex items-center gap-[var(--space-sm)] text-xs text-[var(--text-tertiary)] mt-0.5">
                <span className="flex items-center gap-[var(--space-xs)]">
                  <Avatar name={item.requestor} />
                  {item.requestor}
                </span>
                <span className="flex items-center gap-[var(--space-xs)]">
                  <Clock size={12} />
                  {item.submittedDate}
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-[var(--space-xs)]">
            <StatusBadge status={badge.status} label={badge.label} />
            {item.urgency === "Urgent" && (
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--status-error)]">
                Urgent
              </span>
            )}
          </div>
        </div>

        {/* Approval chain */}
        {item.steps && item.steps.length > 0 && (
          <div className="rounded-md bg-[var(--deep)] px-[var(--space-md)] py-[var(--space-sm)] border border-[var(--border)]">
            <ApprovalChain steps={item.steps} />
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex items-center gap-[var(--space-sm)] flex-wrap">
            <button
              onClick={() => handleAction("approve")}
              disabled={submitting}
              className="carbon-button carbon-button-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check size={14} />
              Approve
            </button>
            <button
              onClick={() => handleAction("reject")}
              disabled={submitting}
              className="carbon-button carbon-button-danger disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X size={14} />
              Reject
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="carbon-button carbon-button-secondary"
            >
              <MessageSquare size={14} />
              Request Changes
            </button>
          </div>
        )}

        {/* Comment toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-[var(--space-xs)] text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors self-start"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {comments.length} comment{comments.length !== 1 ? "s" : ""}
        </button>

        {/* Comments section */}
        {expanded && (
          <div className="flex flex-col gap-[var(--space-md)] border-t border-[var(--border)] pt-[var(--space-md)]">
            <div className="flex flex-col gap-[var(--space-md)]">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-[var(--space-sm)]">
                  <Avatar name={comment.author} />
                  <div className="flex flex-col gap-[var(--space-xs)]">
                    <div className="flex items-center gap-[var(--space-sm)]">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {comment.author}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {comment.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-[var(--text-muted)] italic">
                  No comments yet.
                </p>
              )}
            </div>
            <div className="flex items-start gap-[var(--space-sm)]">
              <Avatar name="You" />
              <div className="flex flex-1 flex-col gap-[var(--space-sm)]">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="carbon-input min-h-[80px] resize-y"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => handleAction("request_changes")}
                    disabled={submitting || !newComment.trim()}
                    className="carbon-button carbon-button-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send size={14} />
                    Post Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("All");

  /* ---- Data fetching ---- */
  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orchestrator/approvals");
      if (res.status === 404) {
        setApprovals([]);
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load approvals (${res.status})`);
      }
      const data = await res.json();
      setApprovals(Array.isArray(data) ? data : data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  /* ---- Action handler ---- */
  const handleAction = async (
    id: string,
    action: "approve" | "reject" | "request_changes",
    comment: string
  ) => {
    const res = await fetch(`/api/orchestrator/approvals/${id}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, comment }),
    });
    if (!res.ok) {
      throw new Error(`Action failed (${res.status})`);
    }
    // Optimistically update local state
    setApprovals((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const newStatus: ApprovalStatus =
          action === "approve"
            ? "Approved"
            : action === "reject"
              ? "Rejected"
              : a.status;
        return {
          ...a,
          status: newStatus,
          steps:
            a.steps?.map((s, i) =>
              i === a.steps.length - 1
                ? { ...s, status: newStatus === "Approved" ? "completed" : s.status }
                : s.status === "active"
                  ? { ...s, status: "completed" }
                  : s
            ) ?? a.steps,
        };
      })
    );
  };

  /* ---- Derived values ---- */
  const filtered = useMemo(() => {
    return approvals.filter((a) => {
      if (statusFilter !== "All" && a.status !== statusFilter) return false;
      if (typeFilter !== "All" && a.type !== typeFilter) return false;
      if (urgencyFilter !== "All" && a.urgency !== urgencyFilter) return false;
      return true;
    });
  }, [approvals, statusFilter, typeFilter, urgencyFilter]);

  const pendingCount = approvals.filter((a) => a.status === "Pending").length;
  const inProgressCount = approvals.filter(
    (a) => a.status === "In Progress"
  ).length;
  const approvedCount = approvals.filter(
    (a) => a.status === "Approved"
  ).length;
  const rejectedCount = approvals.filter(
    (a) => a.status === "Rejected"
  ).length;

  /* ---- Render ---- */
  return (
    <AppShell title="Approval Workflows">
      <div className="mx-auto max-w-5xl flex flex-col gap-[var(--space-xl)]">
        <PageHeader
          title="Approval Workflows"
          breadcrumbs={[
            { label: "Tasks", href: "/tasks" },
            { label: "Approvals" },
          ]}
        />

        {/* Stats */}
        <CardGrid columns={4} gap="md">
          <StatCard
            label="Pending My Approval"
            value={loading ? "—" : pendingCount}
            trend="neutral"
            icon={<Clock size={20} />}
          />
          <StatCard
            label="In Progress"
            value={loading ? "—" : inProgressCount}
            trend="neutral"
            icon={<FileText size={20} />}
          />
          <StatCard
            label="Approved"
            value={loading ? "—" : approvedCount}
            icon={<Check size={20} />}
          />
          <StatCard
            label="Rejected"
            value={loading ? "—" : rejectedCount}
            icon={<X size={20} />}
          />
        </CardGrid>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-[var(--space-md)]">
          <div className="flex items-center gap-[var(--space-xs)]">
            <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="carbon-input py-1.5 text-sm w-36"
            >
              <option>All</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>In Progress</option>
            </select>
          </div>
          <div className="flex items-center gap-[var(--space-xs)]">
            <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium">
              Type
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="carbon-input py-1.5 text-sm w-44"
            >
              <option>All</option>
              <option>Invoice</option>
              <option>Contract</option>
              <option>Policy Change</option>
              <option>Agent Action</option>
            </select>
          </div>
          <div className="flex items-center gap-[var(--space-xs)]">
            <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium">
              Urgency
            </span>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="carbon-input py-1.5 text-sm w-32"
            >
              <option>All</option>
              <option>Urgent</option>
              <option>Normal</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-[var(--space-md)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="carbon-card p-[var(--space-2xl)] text-center">
            <p className="text-[var(--status-error)] mb-[var(--space-md)]">
              {error}
            </p>
            <button
              onClick={fetchApprovals}
              className="carbon-button carbon-button-secondary"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        ) : approvals.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={48} />}
            title="No approval requests"
            description="Items requiring your approval will appear here."
          />
        ) : filtered.length === 0 ? (
          <div className="carbon-card p-[var(--space-2xl)] text-center text-[var(--text-secondary)]">
            No approvals match the selected filters.
          </div>
        ) : (
          <div className="flex flex-col gap-[var(--space-md)]">
            {filtered.map((item) => (
              <ApprovalCard
                key={item.id}
                item={item}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
