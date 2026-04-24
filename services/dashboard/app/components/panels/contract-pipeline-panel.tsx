"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { StatCard } from "@/app/components/ui/stat-card";
import { DataTable } from "@/app/components/ui/data-table";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { EmptyState } from "@/app/components/ui/empty-state";

interface Contract {
  id: string;
  title: string;
  contractType: string;
  status: string;
  counterparty: string;
  updatedAt: string;
}

export function ContractPipelinePanel() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContracts() {
      try {
        const [contractsRes, docsRes] = await Promise.all([
          fetch("/api/contract-hub/contracts?limit=50"),
          fetch("/api/contract-hub/documents?limit=1"),
        ]);
        if (contractsRes.ok) {
          const data = await contractsRes.json();
          setContracts(Array.isArray(data) ? data : data.contracts || []);
        }
        if (docsRes.ok) {
          const data = await docsRes.json();
          setDocCount(data.total || data.length || 0);
        }
      } catch {
        setContracts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchContracts();
    const interval = setInterval(fetchContracts, 30000);
    return () => clearInterval(interval);
  }, []);

  const inReview = contracts.filter((c) =>
    ["draft", "review", "negotiation", "pending_approval"].includes(c.status)
  ).length;
  const archived = contracts.filter((c) => c.status === "archived").length;

  const statusBadge = (status: string) => {
    const map: Record<string, { status: "success" | "warning" | "neutral" | "info" | "error"; label: string }> = {
      approved: { status: "success", label: "Approved" },
      signed: { status: "success", label: "Signed" },
      active: { status: "success", label: "Active" },
      draft: { status: "warning", label: "Draft" },
      review: { status: "warning", label: "Review" },
      archived: { status: "neutral", label: "Archived" },
      expired: { status: "neutral", label: "Expired" },
      terminated: { status: "error", label: "Terminated" },
    };
    const s = map[status] || { status: "neutral", label: status };
    return <StatusBadge status={s.status} label={s.label} size="sm" />;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Uploaded" value={docCount} icon={<FileText size={18} />} />
        <StatCard label="In Review" value={inReview} icon={<FileText size={18} />} />
        <StatCard label="Archived" value={archived} icon={<FileText size={18} />} />
      </div>

      {loading ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-tertiary)]">
          Loading contracts...
        </div>
      ) : contracts.length === 0 ? (
        <EmptyState icon={<FileText size={32} />} title="No contracts" description="Upload contracts in the Contract Hub." />
      ) : (
        <DataTable
          columns={[
            { key: "title", label: "Title", sortable: true },
            { key: "contractType", label: "Type", sortable: true },
            { key: "status", label: "Status", sortable: true, render: (_, row) => statusBadge(row.status) },
            { key: "counterparty", label: "Counterparty", sortable: true },
            { key: "updatedAt", label: "Updated", sortable: true, render: (v) => new Date(v).toLocaleString() },
          ]}
          data={contracts}
          pageSize={5}
          emptyMessage="No contracts found"
        />
      )}
    </div>
  );
}
