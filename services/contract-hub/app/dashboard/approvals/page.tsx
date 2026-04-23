'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { approvalsApi, type Approval } from '@/lib/api';

const statusColors: Record<string, string> = {
  pending: 'bg-[#FFFBEB] text-[#B45309]',
  approved: 'bg-[#F0FDF4] text-[#15803D]',
  rejected: 'bg-[#FEF2F2] text-[#B91C1C]',
  cancelled: 'bg-[#F1F5F9] text-[#94A3B8]',
};

const typeIcons: Record<string, string> = {
  contract: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  document: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  invoice: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6',
};

export default function ApprovalsPage() {
  const { user } = useUser();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    const result = await approvalsApi.list({
      status: filter !== 'all' ? filter : undefined,
    });
    if (result.success && result.data) {
      setApprovals(result.data);
    }
    setLoading(false);
  }, [filter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleApprove = async (id: string) => {
    if (!user?.id) return;
    setProcessing(id);
    await approvalsApi.approve(id, user.id);
    setProcessing(null);
    fetchApprovals();
  };

  const handleReject = async (id: string) => {
    if (!user?.id) return;
    setProcessing(id);
    await approvalsApi.reject(id, user.id);
    setProcessing(null);
    fetchApprovals();
  };

  // Map approvableId to a display title from the current data
  const getApprovalTitle = (approval: Approval) => {
    const titleMap: Record<string, string> = {
      'contract-1': 'MSA - Acme Corporation',
      'contract-2': 'NDA - Beta Pty Ltd',
      'contract-3': 'Software License - Gamma Industries',
      'contract-4': 'Employment Agreement - J. Smith',
      'contract-5': 'MSA - Delta Corp',
      'doc-1': 'Master Services Agreement - Acme Corp',
      'doc-2': 'NDA - Beta Pty Ltd',
      'doc-3': 'Policy Update - Data Privacy',
      'doc-4': 'Supply Agreement - Gamma Industries',
    };
    return titleMap[approval.approvableId] || `${approval.approvableType} ${approval.approvableId.slice(0, 8)}...`;
  };

  return (
    <div>
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(148,163,184,0.2)] bg-white/80 px-3 py-1 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#64748B]">Workflow</span>
        </div>
        <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-bold text-[#0F172A] tracking-tight">Approvals</h1>
        <p className="mt-2 text-[0.875rem] text-[#64748B] max-w-[50ch]">Review and approve contracts, documents, and AI-generated content</p>
      </div>

      {/* Status Tabs */}
      <div className="mb-6 flex gap-2">
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
              filter === status
                ? 'bg-[#10B981] text-white'
                : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            {status === 'pending' && ` (${approvals.filter(a => a.status === 'pending').length})`}
          </button>
        ))}
      </div>

      {/* Approvals List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <div className="skeleton w-48 h-4 rounded-full" />
          <div className="skeleton w-64 h-3 rounded" />
        </div>
      ) : approvals.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <svg className="w-12 h-12 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[0.875rem] font-medium text-[#0F172A]">No approvals found</p>
          <p className="text-[0.8125rem] text-[#64748B]">Approvals will appear here when requested</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <div key={approval.id} className="stagger-item group bg-white rounded-[1.25rem] border border-[rgba(148,163,184,0.15)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:-translate-y-[1px] hover:border-[rgba(16,185,129,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" style={{ '--index': approvals.indexOf(approval) } as React.CSSProperties}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 bg-[#EFF6FF] rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#1D4ED8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={typeIcons[approval.approvableType] || typeIcons.contract} />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-[0.875rem] font-semibold text-[#0F172A]">{getApprovalTitle(approval)}</h3>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[approval.status] || 'bg-gray-100 text-gray-800'}`}>
                        {approval.status}
                      </span>
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-[#EFF6FF] text-[#1D4ED8]">
                        {approval.approvableType}
                      </span>
                    </div>
                    <p className="text-[0.6875rem] font-mono text-[#64748B]">
                      Requested &middot; {new Date(approval.createdAt).toLocaleDateString('en-AU')}
                    </p>
                    {approval.comments && (
                      <p className="text-[0.75rem] text-[#64748B] mt-1 italic">{approval.comments}</p>
                    )}
                  </div>
                </div>

                {approval.status === 'pending' && (
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() => handleReject(approval.id)}
                      disabled={processing === approval.id}
                      className="px-4 py-1.5 text-[0.6875rem] font-medium text-[#B91C1C] bg-[#FEF2F2] rounded-full hover:bg-[#FEE2E2] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(approval.id)}
                      disabled={processing === approval.id}
                      className="px-4 py-1.5 text-[0.6875rem] font-medium text-white bg-[#10B981] rounded-full hover:bg-[#059669] active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
                    >
                      {processing === approval.id ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}