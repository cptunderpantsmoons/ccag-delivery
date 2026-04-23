// components/ccag/approvals-panel.tsx
'use client';

import { useCcag } from '@/lib/ccag/provider';
import { Check, X, ShieldCheck, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function CcagApprovalsPanel() {
  const { approvals, respondToApproval, isConnected } = useCcag();
  const [responding, setResponding] = useState<string | null>(null);

  const handleResponse = async (id: string, action: 'approve' | 'deny' | 'always') => {
    setResponding(id);
    try {
      await respondToApproval(id, action);
    } finally {
      setResponding(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-center h-20 text-[var(--text-secondary)] text-sm">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </div>
      </div>
    );
  }

  const pending = approvals.filter((a) => a.status === 'pending');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Approvals
          {pending.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
              {pending.length}
            </span>
          )}
        </h3>
      </div>

      {pending.length === 0 && (
        <div className="text-xs text-[var(--text-secondary)] text-center py-4">
          No pending approvals
        </div>
      )}

      {pending.map((approval) => (
        <div key={approval.id} className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-primary)] truncate">{approval.toolName}</span>
            <span className="text-xs px-1.5 py-0.5 rounded border border-[var(--border)]">pending</span>
          </div>

          <div className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--background)] p-2 rounded overflow-x-auto">
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(approval.arguments, null, 2)}
            </pre>
          </div>

          <div className="flex gap-2">
            <button
              className="flex-1 flex items-center justify-center gap-1 rounded-md bg-[var(--deep)] text-[var(--text-primary)] text-xs px-2 py-1.5 disabled:opacity-50"
              onClick={() => handleResponse(approval.id, 'approve')}
              disabled={responding === approval.id}
            >
              {responding === approval.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  Allow
                </>
              )}
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-1 rounded-md border border-[var(--border)] text-[var(--text-primary)] text-xs px-2 py-1.5 disabled:opacity-50"
              onClick={() => handleResponse(approval.id, 'always')}
              disabled={responding === approval.id}
            >
              <ShieldCheck className="h-3 w-3" />
              Always
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-1 rounded-md bg-red-500 text-white text-xs px-2 py-1.5 disabled:opacity-50"
              onClick={() => handleResponse(approval.id, 'deny')}
              disabled={responding === approval.id}
            >
              <X className="h-3 w-3" />
              Deny
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
