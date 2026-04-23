"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { StatCard } from "@/app/components/ui/stat-card";
import { StatusBadge } from "@/app/components/ui/status-badge";

interface HealthStatus {
  orchestrator: { status: string; latency: number };
  adapter: { status: string; latency: number };
  models: string[];
  timestamp: string;
}

export function InferenceHealthPanel() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch("/api/inference/status");
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
        }
      } catch {
        setHealth(null);
      } finally {
        setLoading(false);
      }
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, { status: "success" | "error" | "warning"; label: string }> = {
      healthy: { status: "success", label: "Healthy" },
      ok: { status: "success", label: "OK" },
      unreachable: { status: "error", label: "Unreachable" },
      degraded: { status: "warning", label: "Degraded" },
    };
    const s = map[status] || { status: "warning", label: status || "Unknown" };
    return <StatusBadge status={s.status} label={s.label} size="sm" />;
  };

  const services = health
    ? [
        { name: "Orchestrator", status: health.orchestrator.status, latency: health.orchestrator.latency },
        { name: "Adapter", status: health.adapter.status, latency: health.adapter.latency },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Orchestrator"
          value={health?.orchestrator.status || "Unknown"}
          icon={<Activity size={18} />}
        />
        <StatCard
          label="Adapter"
          value={health?.adapter.status || "Unknown"}
          icon={<Activity size={18} />}
        />
      </div>

      {loading ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-tertiary)]">
          Loading health status...
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-[var(--space-md)] py-[var(--space-sm)] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Service</th>
                <th className="px-[var(--space-md)] py-[var(--space-sm)] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Status</th>
                <th className="px-[var(--space-md)] py-[var(--space-sm)] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Latency</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc, i) => (
                <tr key={svc.name} className={`group border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--deep)] ${i % 2 === 0 ? "bg-[var(--surface)]" : "bg-[var(--elevated)]/40"}`}>
                  <td className="px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-primary)]">{svc.name}</td>
                  <td className="px-[var(--space-md)] py-[var(--space-sm)]">{statusBadge(svc.status)}</td>
                  <td className="px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-secondary)]">{svc.latency}ms</td>
                </tr>
              ))}
              {health?.models && health.models.length > 0 && (
                <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--deep)] bg-[var(--elevated)]/40">
                  <td className="px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-primary)]">Available Models</td>
                  <td className="px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-secondary)]" colSpan={2}>
                    {health.models.join(", ")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
