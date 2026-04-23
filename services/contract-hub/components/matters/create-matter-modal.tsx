'use client';

import { useState, useCallback, useEffect } from 'react';
import { mattersApi, type Matter, type CreateMatterInput } from '@/lib/api';

interface CreateMatterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  matter?: Matter | null;
}

const MATTER_TYPES = ['litigation', 'transactional', 'advisory', 'compliance'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const STATUSES = ['open', 'in_progress', 'pending_review', 'closed', 'on_hold', 'cancelled'] as const;

export default function CreateMatterModal({ isOpen, onClose, onSuccess, matter }: CreateMatterModalProps) {
  const isEditMode = !!matter;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('medium');
  const [matterType, setMatterType] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && matter) {
      setTitle(matter.title);
      setDescription(matter.description || '');
      setStatus(matter.status);
      setPriority(matter.priority);
      setMatterType(matter.matterType || '');
      setDueDate(matter.dueDate ? new Date(matter.dueDate).toISOString().split('T')[0] : '');
    } else if (isOpen && !matter) {
      setTitle('');
      setDescription('');
      setStatus('open');
      setPriority('medium');
      setMatterType('');
      setDueDate('');
      setError(null);
    }
  }, [isOpen, matter]);

  const handleClose = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [saving, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Please enter a matter title');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data: CreateMatterInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        matterType: matterType || undefined,
        dueDate: dueDate || undefined,
      };

      const result = isEditMode
        ? await mattersApi.update(matter!.id, data)
        : await mattersApi.create(data);

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setError(result.error || `Failed to ${isEditMode ? 'update' : 'create'} matter`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  }, [title, description, status, priority, matterType, dueDate, isEditMode, matter, onSuccess, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[1.25rem] shadow-[0_4px_16px_rgba(0,0,0,0.05),0_16px_48px_rgba(0,0,0,0.1)]">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[rgba(148,163,184,0.15)] px-6 py-5 rounded-t-[1.25rem]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[1.125rem] font-semibold text-[#0F172A] tracking-tight">
                {isEditMode ? 'Edit Matter' : 'New Matter'}
              </h2>
              <p className="mt-1 text-[0.8125rem] text-[#64748B]">
                {isEditMode ? 'Update matter details' : 'Create a new legal matter'}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={saving}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            >
              <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
              Title <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Matter title"
              disabled={saving}
              className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            />
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                Matter Type
              </label>
              <select
                value={matterType}
                onChange={(e) => setMatterType(e.target.value)}
                disabled={saving}
                className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
              >
                <option value="">Select type</option>
                {MATTER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={saving}
                className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            {isEditMode && (
              <div>
                <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={saving}
                  className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={isEditMode ? '' : 'col-span-2'}>
              <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={saving}
                className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              disabled={saving}
              className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 resize-y transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] text-sm rounded-xl border border-[rgba(252,165,165,0.3)]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[rgba(148,163,184,0.15)] px-6 py-4 rounded-b-[1.25rem]">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-[#0F172A] border border-[rgba(148,163,184,0.3)] rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !title.trim()}
              className="group inline-flex items-center gap-2 px-5 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-full hover:bg-[#059669] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  {isEditMode ? 'Save Changes' : 'Create Matter'}
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
