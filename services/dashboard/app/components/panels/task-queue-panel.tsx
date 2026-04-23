"use client";

import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { StatCard } from "@/app/components/ui/stat-card";
import { DataTable } from "@/app/components/ui/data-table";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { EmptyState } from "@/app/components/ui/empty-state";

interface Task {
  id: string;
  name: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  userId: string;
  createdAt: string;
}

export function TaskQueuePanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/agents/task");
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data) ? data : []);
        }
      } catch {
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, []);

  const total = tasks.length;
  const queued = tasks.filter((t) => t.status === "queued").length;
  const running = tasks.filter((t) => t.status === "running").length;
  const completed = tasks.filter((t) => t.status === "completed").length;

  const statusBadge = (status: string) => {
    const map: Record<string, { status: "info" | "success" | "error" | "neutral"; label: string }> = {
      queued: { status: "neutral", label: "Queued" },
      running: { status: "info", label: "Running" },
      completed: { status: "success", label: "Completed" },
      failed: { status: "error", label: "Failed" },
    };
    const s = map[status] || { status: "neutral", label: status };
    return <StatusBadge status={s.status} label={s.label} size="sm" />;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Tasks" value={total} icon={<ListChecks size={18} />} />
        <StatCard label="Queued" value={queued} icon={<ListChecks size={18} />} />
        <StatCard label="Running" value={running} icon={<ListChecks size={18} />} />
        <StatCard label="Completed" value={completed} icon={<ListChecks size={18} />} />
      </div>

      {loading ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-tertiary)]">
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={<ListChecks size={32} />} title="No tasks" description="Agent tasks will appear here." />
      ) : (
        <DataTable
          columns={[
            { key: "name", label: "Name", sortable: true },
            { key: "status", label: "Status", sortable: true, render: (_, row) => statusBadge(row.status) },
            { key: "progress", label: "Progress", sortable: true, render: (v) => `${v}%` },
            { key: "createdAt", label: "Created", sortable: true, render: (v) => new Date(v).toLocaleString() },
          ]}
          data={tasks}
          pageSize={5}
          emptyMessage="No tasks found"
        />
      )}
    </div>
  );
}
