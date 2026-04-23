'use client';

import { useState, useEffect, useCallback } from 'react';
import { mattersApi, type Matter } from '@/lib/api';
import CreateMatterModal from '@/components/matters/create-matter-modal';

const matterStatusColors: Record<string, string> = {
  open: 'bg-[#EFF6FF] text-[#1D4ED8]',
  in_progress: 'bg-[#FFFBEB] text-[#B45309]',
  pending_review: 'bg-[#FFF7ED] text-[#C2410C]',
  closed: 'bg-[#F1F5F9] text-[#94A3B8]',
  on_hold: 'bg-[#F8FAFC] text-[#64748B]',
  cancelled: 'bg-[#FEF2F2] text-[#B91C1C]',
};

const priorityColors: Record<string, string> = {
  low: 'bg-[#F1F5F9] text-[#94A3B8]',
  medium: 'bg-[#FFFBEB] text-[#B45309]',
  high: 'bg-[#FFF7ED] text-[#C2410C]',
  critical: 'bg-[#FEF2F2] text-[#B91C1C]',
};

export default function MattersPage() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMatter, setEditingMatter] = useState<Matter | null>(null);

  const fetchMatters = useCallback(async () => {
    setLoading(true);
    const result = await mattersApi.list({
      status: filter !== 'all' ? filter : undefined,
    });
    if (result.success && result.data) {
      setMatters(result.data);
    }
    setLoading(false);
  }, [filter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchMatters(); }, [fetchMatters]);

  return (
    <>
      <div>
        <div className="mb-10 flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(148,163,184,0.2)] bg-white/80 px-3 py-1 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#64748B]">Legal</span>
          </div>
          <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-bold text-[#0F172A] tracking-tight">Matters</h1>
          <p className="mt-2 text-[0.875rem] text-[#64748B] max-w-[50ch]">Track and manage legal matters and workflows</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-5 py-2.5 border border-[rgba(148,163,184,0.3)] text-sm font-medium rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] text-[#0F172A]" onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Start Intake
          </button>
          <button className="group inline-flex items-center gap-2 px-5 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-full hover:bg-[#059669] active:scale-[0.98] transition-all duration-300" onClick={() => { setEditingMatter(null); setShowCreateModal(true); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Matter
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {['all', 'open', 'in_progress', 'pending_review', 'closed', 'on_hold'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] whitespace-nowrap ${
              filter === status ? 'bg-[#10B981] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Matters List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <div className="skeleton w-48 h-4 rounded-full" />
          <div className="skeleton w-64 h-3 rounded" />
        </div>
      ) : matters.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <svg className="w-12 h-12 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-[0.875rem] font-medium text-[#0F172A]">No matters found</p>
          <p className="text-[0.8125rem] text-[#64748B]">Create a matter or adjust your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matters.map((matter) => (
            <div key={matter.id} className="stagger-item group bg-white rounded-[1.25rem] border border-[rgba(148,163,184,0.15)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:-translate-y-[1px] hover:border-[rgba(16,185,129,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" style={{ '--index': matters.indexOf(matter) } as React.CSSProperties}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-[0.9375rem] font-semibold text-[#0F172A]">{matter.title}</h3>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${matterStatusColors[matter.status] || 'bg-[#F1F5F9] text-[#64748B]'}`}>
                      {matter.status.replace(/_/g, ' ')}
                    </span>
                    {matter.priority && (
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors[matter.priority] || 'bg-[#F1F5F9] text-[#64748B]'}`}>
                        {matter.priority}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-[0.8125rem] text-[#64748B]">
                    {matter.matterType && (
                      <span>Type: <span className="font-medium text-[#334155] capitalize">{matter.matterType}</span></span>
                    )}
                    {matter.dueDate && (
                      <span>Due: <span className="font-mono text-[#334155]">{new Date(matter.dueDate).toLocaleDateString('en-AU')}</span></span>
                    )}
                    <span>Created: <span className="font-mono text-[#334155]">{new Date(matter.createdAt).toLocaleDateString('en-AU')}</span></span>
                  </div>
                  {matter.description && (
                    <p className="mt-2 text-[0.75rem] text-[#64748B]">{matter.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-1.5 text-[0.6875rem] font-medium text-[#059669] bg-[#F0FDF4] rounded-full hover:bg-[#D1FAE5] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" onClick={() => setEditingMatter(matter)}>
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      <CreateMatterModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchMatters();
        }}
        matter={editingMatter}
      />
    </>
  );
}