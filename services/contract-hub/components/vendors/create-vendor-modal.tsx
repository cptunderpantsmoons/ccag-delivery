'use client';

import { useState, useCallback, useEffect } from 'react';
import { vendorsApi, type Vendor, type CreateVendorInput } from '@/lib/api';

interface CreateVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendor?: Vendor | null;
}

const VENDOR_TYPES = ['outside_counsel', 'legal_services', 'consulting'] as const;

export default function CreateVendorModal({ isOpen, onClose, onSuccess, vendor }: CreateVendorModalProps) {
  const isEditMode = !!vendor;

  const [name, setName] = useState('');
  const [vendorType, setVendorType] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && vendor) {
      setName(vendor.name);
      setVendorType(vendor.vendorType || '');
      setContactName(vendor.contactName || '');
      setContactEmail(vendor.contactEmail || '');
      setContactPhone(vendor.contactPhone || '');
      setBillingAddress(vendor.billingAddress || '');
      setWebsite(vendor.website || '');
      setNotes(vendor.notes || '');
    } else if (isOpen && !vendor) {
      setName('');
      setVendorType('');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setBillingAddress('');
      setWebsite('');
      setNotes('');
      setError(null);
    }
  }, [isOpen, vendor]);

  const handleClose = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [saving, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError('Please enter a vendor name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data: CreateVendorInput = {
        name: name.trim(),
        vendorType: vendorType || undefined,
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        billingAddress: billingAddress.trim() || undefined,
        website: website.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const result = isEditMode
        ? await vendorsApi.update(vendor!.id, data)
        : await vendorsApi.create(data);

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setError(result.error || `Failed to ${isEditMode ? 'update' : 'create'} vendor`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  }, [name, vendorType, contactName, contactEmail, contactPhone, billingAddress, website, notes, isEditMode, vendor, onSuccess, handleClose]);

  if (!isOpen) return null;

  const vendorTypeLabels: Record<string, string> = {
    outside_counsel: 'Outside Counsel',
    legal_services: 'Legal Services',
    consulting: 'Consulting',
  };

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
                {isEditMode ? 'Edit Vendor' : 'Add Vendor'}
              </h2>
              <p className="mt-1 text-[0.8125rem] text-[#64748B]">
                {isEditMode ? 'Update vendor details' : 'Add a new vendor or outside counsel'}
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
          {/* Name & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                Vendor Name <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Company name"
                disabled={saving}
                className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                Vendor Type
              </label>
              <select
                value={vendorType}
                onChange={(e) => setVendorType(e.target.value)}
                disabled={saving}
                className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
              >
                <option value="">Select type</option>
                {VENDOR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {vendorTypeLabels[type] || type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
              Contact Name
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Primary contact name"
              disabled={saving}
              className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="email@example.com"
                disabled={saving}
                className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+61 ..."
                disabled={saving}
                className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
              Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              disabled={saving}
              className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            />
          </div>

          {/* Billing Address */}
          <div>
            <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
              Billing Address
            </label>
            <textarea
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Billing address"
              rows={2}
              disabled={saving}
              className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 resize-y transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes"
              rows={2}
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
              disabled={saving || !name.trim()}
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
                  {isEditMode ? 'Save Changes' : 'Add Vendor'}
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
