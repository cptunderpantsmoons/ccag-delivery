'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  ClipboardList,
  FileText,
  Sparkles,
  ArrowRight,
  FileSignature,
} from 'lucide-react';
import { contractsApi, type Contract } from '@/lib/api';
import CreateContractModal from '@/components/contracts/create-contract-modal';
import { Badge, statusToBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

const FILTERS = [
  'all',
  'draft',
  'review',
  'negotiation',
  'pending_approval',
  'active',
  'expired',
] as const;

export default function ContractsPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number] | string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    const result = await contractsApi.list({
      status: filter !== 'all' ? filter : undefined,
    });
    if (result.success && result.data) {
      setContracts(result.data);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContracts();
  }, [fetchContracts]);

  const formatCurrency = (amount: string | null) => {
    if (!amount) return '—';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(num);
  };

  return (
    <div>
      <PageHeader
        title="Contracts"
        description="Manage contract lifecycle from draft to execution"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(true)}>
              <ClipboardList className="h-4 w-4" strokeWidth={2} />
              Start Intake
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditingContract(null);
                setShowCreateModal(true);
              }}
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              New Contract
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </span>
            </Button>
          </>
        }
      />

      {/* Status Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-[0.8125rem] font-medium transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
              filter === status
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--deep)] text-[var(--text-secondary)] hover:bg-[var(--elevated)]'
            }`}
            aria-pressed={filter === status}
          >
            {status === 'all'
              ? 'All'
              : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Contracts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="space-y-2">
                  <div className="skeleton h-4 w-40 rounded" />
                  <div className="skeleton h-3 w-28 rounded" />
                </div>
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-3/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] py-16">
          <FileSignature className="h-12 w-12 text-[var(--text-tertiary)]" strokeWidth={1} />
          <p className="text-[0.875rem] font-medium text-[var(--text-primary)]">No contracts found</p>
          <p className="text-[0.8125rem] text-[var(--text-secondary)]">
            Create a contract or adjust your filters
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-2"
            onClick={() => {
              setEditingContract(null);
              setShowCreateModal(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            New Contract
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {contracts.map((contract, index) => (
            <div
              key={contract.id}
              className="stagger-item group rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-[1px] hover:border-[var(--accent)]/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
              style={{ '--index': index } as React.CSSProperties}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[0.9375rem] font-semibold text-[var(--text-primary)]">
                    {contract.title}
                  </h3>
                  <p className="mt-1 truncate font-mono text-[0.6875rem] text-[var(--text-secondary)]">
                    {contract.counterpartyName}
                  </p>
                </div>
                <Badge variant={statusToBadgeVariant(contract.status)}>
                  {contract.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              <div className="space-y-1.5 text-[0.8125rem] text-[var(--text-secondary)]">
                <div className="flex items-center justify-between">
                  <span>Type</span>
                  <span className="font-medium uppercase text-[var(--text-primary)]">
                    {contract.contractType}
                  </span>
                </div>
                {contract.effectiveDate && (
                  <div className="flex items-center justify-between">
                    <span>Effective</span>
                    <span className="font-mono text-[var(--text-primary)]">
                      {new Date(contract.effectiveDate).toLocaleDateString('en-AU')}
                    </span>
                  </div>
                )}
                {contract.expirationDate && (
                  <div className="flex items-center justify-between">
                    <span>Expiry</span>
                    <span className="font-mono text-[var(--text-primary)]">
                      {new Date(contract.expirationDate).toLocaleDateString('en-AU')}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span>Value</span>
                  <span className="font-mono text-[0.875rem] font-semibold text-[var(--text-primary)]">
                    {formatCurrency(contract.valueAmount)}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 bg-[var(--accent-dim)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                  onClick={() => setEditingContract(contract)}
                >
                  <FileText className="h-3.5 w-3.5" strokeWidth={2} />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 bg-[var(--accent-dim)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                  onClick={() =>
                    router.push(`/dashboard/ai?entityType=contract&entityId=${contract.id}`)
                  }
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                  AI Review
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateContractModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingContract(null);
        }}
        onSuccess={fetchContracts}
        contract={editingContract}
      />
    </div>
  );
}
