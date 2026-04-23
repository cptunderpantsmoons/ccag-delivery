'use client';

import { useState, useCallback, useEffect } from 'react';
import { contractsApi, type Contract, type CreateContractInput } from '@/lib/api';

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contract?: Contract | null;
}

const CONTRACT_TYPES = ['nda', 'msa', 'vendor', 'employment', 'lease', 'sow', 'other'] as const;
const STATUSES = ['draft', 'review', 'negotiation', 'pending_approval', 'approved', 'signed', 'active', 'expired', 'terminated', 'archived'] as const;

export default function CreateContractModal({ isOpen, onClose, onSuccess, contract }: CreateContractModalProps) {
  const isEditMode = !!contract;

  const [title, setTitle] = useState('');
  const [contractType, setContractType] = useState('nda');
  const [status, setStatus] = useState('draft');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [counterpartyEmail, setCounterpartyEmail] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [valueAmount, setValueAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && contract) {
      setTitle(contract.title);
      setContractType(contract.contractType);
      setStatus(contract.status);
      setCounterpartyName(contract.counterpartyName);
      setCounterpartyEmail(contract.counterpartyEmail || '');
      setEffectiveDate(contract.effectiveDate || '');
      setExpirationDate(contract.expirationDate || '');
      setValueAmount(contract.valueAmount || '');
      setDescription(contract.description || '');
    } else if (isOpen && !contract) {
      setTitle('');
      setContractType('nda');
      setStatus('draft');
      setCounterpartyName('');
      setCounterpartyEmail('');
      setEffectiveDate('');
      setExpirationDate('');
      setValueAmount('');
      setDescription('');
      setError(null);
    }
  }, [isOpen, contract]);

  const handleClose = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [saving, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Please enter a contract title');
      return;
    }
    if (!counterpartyName.trim()) {
      setError('Please enter a counterparty name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data: CreateContractInput = {
        title: title.trim(),
        contractType,
        status,
        counterpartyName: counterpartyName.trim(),
        counterpartyEmail: counterpartyEmail.trim() || undefined,
        effectiveDate: effectiveDate || undefined,
        expirationDate: expirationDate || undefined,
        valueAmount: valueAmount || undefined,
        description: description.trim() || undefined,
      };

      const result = isEditMode
        ? await contractsApi.update(contract!.id, data)
        : await contractsApi.create(data);

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setError(result.error || `Failed to ${isEditMode ? 'update' : 'create'} contract`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  }, [title, contractType, status, counterpartyName, counterpartyEmail, effectiveDate, expirationDate, valueAmount, description, isEditMode, contract, onSuccess, handleClose]);

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
                {isEditMode ? 'Edit Contract' : 'New Contract'}
              </h2>
              <p className="mt-1 text-[0.8125rem] text-[#64748B]">
                {isEditMode ? 'Update contract details' : 'Create a new contract'}
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
              placeholder="Contract title"
              disabled={saving}
              className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            />
          </div>

          {/* Type & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                Contract Type <span className="text-[#B91C1C]">*</span>
              </label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                disabled={saving}
                className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
              >
                {CONTRACT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
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
          </div>

          {/* Counterparty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                Counterparty Name <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                type="text"
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                placeholder="Company or individual name"
                disabled={saving}
                className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                Counterparty Email
              </label>
              <input
                type="email"
                value={counterpartyEmail}
                onChange={(e) => setCounterpartyEmail(e.target.value)}
                placeholder="email@example.com"
                disabled={saving}
                className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                Effective Date
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                disabled={saving}
                className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                Expiration Date
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                disabled={saving}
                className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Value */}
          <div>
            <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
              Contract Value (AUD)
            </label>
            <input
              type="number"
              value={valueAmount}
              onChange={(e) => setValueAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              disabled={saving}
              className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            />
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
              disabled={saving || !title.trim() || !counterpartyName.trim()}
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
                  {isEditMode ? 'Save Changes' : 'Create Contract'}
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
