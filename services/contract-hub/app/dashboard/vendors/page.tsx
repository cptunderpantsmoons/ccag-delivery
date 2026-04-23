'use client';

import { useState, useEffect, useCallback } from 'react';
import { vendorsApi, type Vendor } from '@/lib/api';
import CreateVendorModal from '@/components/vendors/create-vendor-modal';

const vendorTypeLabels: Record<string, string> = {
  outside_counsel: 'Outside Counsel',
  legal_services: 'Legal Services',
  consulting: 'Consulting',
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVendor] = useState<Vendor | null>(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    const result = await vendorsApi.list({ active: true });
    if (result.success && result.data) {
      setVendors(result.data);
    }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  return (
    <>
      <div className="mb-10 flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(148,163,184,0.2)] bg-white/80 px-3 py-1 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#64748B]">Directory</span>
          </div>
          <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-bold text-[#0F172A] tracking-tight">Vendors</h1>
          <p className="mt-2 text-[0.875rem] text-[#64748B] max-w-[50ch]">Manage outside counsel and legal service providers</p>
        </div>
        <button className="group inline-flex items-center gap-2 px-5 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-full hover:bg-[#059669] active:scale-[0.98] transition-all duration-300" onClick={() => setShowCreateModal(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Vendor
          <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </button>
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <div className="skeleton w-48 h-4 rounded-full" />
          <div className="skeleton w-56 h-3 rounded" />
        </div>
      ) : vendors.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <svg className="w-12 h-12 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a3 3 0 005.356 0M12 14a3 3 0 100-6 3 3 0 000 6z" />
          </svg>
          <p className="text-[0.875rem] font-medium text-[#0F172A]">No vendors found</p>
          <p className="text-[0.8125rem] text-[#64748B]">Add a vendor to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor) => (
            <div key={vendor.id} className={`stagger-item bg-white rounded-[1.25rem] border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:-translate-y-[1px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${vendor.isActive ? 'border-[rgba(148,163,184,0.15)] hover:border-[rgba(16,185,129,0.3)]' : 'border-[rgba(148,163,184,0.1)] opacity-60'}`} style={{ '--index': vendors.indexOf(vendor) } as React.CSSProperties}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-[#0F172A]">{vendor.name}</h3>
                  {vendor.vendorType && (
                    <span className="inline-flex px-2.5 py-0.5 text-[0.6875rem] font-medium rounded-full bg-[#EFF6FF] text-[#1D4ED8] mt-1">
                      {vendorTypeLabels[vendor.vendorType] || vendor.vendorType}
                    </span>
                  )}
                </div>
                <span className={`inline-flex px-2.5 py-0.5 text-[0.6875rem] font-medium rounded-full ${vendor.isActive ? 'bg-[#F0FDF4] text-[#15803D]' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>
                  {vendor.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 text-[0.8125rem] text-[#64748B]">
                {vendor.contactName && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{vendor.contactName}</span>
                  </div>
                )}
                {vendor.contactEmail && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{vendor.contactEmail}</span>
                  </div>
                )}
                {vendor.contactPhone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{vendor.contactPhone}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[rgba(148,163,184,0.12)] flex items-center gap-2">
                <button className="flex-1 px-3 py-1.5 text-[0.6875rem] font-medium text-[#059669] bg-[#F0FDF4] rounded-full hover:bg-[#D1FAE5] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  View Details
                </button>
                <button className="flex-1 px-3 py-1.5 text-[0.6875rem] font-medium text-[#1D4ED8] bg-[#EFF6FF] rounded-full hover:bg-[#DBEAFE] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  View Invoices
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateVendorModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchVendors();
        }}
        vendor={editingVendor}
      />
    </>
  );
}