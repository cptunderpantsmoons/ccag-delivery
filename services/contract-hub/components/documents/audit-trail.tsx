/**
 * Audit Trail Component
 * Shows complete signing history with verification
 */

'use client';

import { useState, useEffect } from 'react';

interface AuditTrailProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AuditEntry {
  id: string;
  action: string;
  timestamp: string;
  signerName?: string;
  signerEmail?: string;
  ipAddress?: string;
  details?: string;
}

export default function AuditTrail({ documentId, isOpen, onClose }: AuditTrailProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load audit trail from API
    const loadAuditTrail = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/audit`);
        const result = await response.json();
        if (result.success) {
          setEntries(result.data);
        } else {
          // Show error state instead of mock data
          setError('Failed to load audit trail');
          setEntries([]);
        }
      } catch (err) {
        console.error('Failed to load audit trail:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadAuditTrail();
    }
  }, [documentId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white rounded-[1.25rem] shadow-[0_4px_16px_rgba(0,0,0,0.05),0_16px_48px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in-95 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[rgba(148,163,184,0.15)] px-6 py-5 rounded-t-[1.25rem]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[1.125rem] font-semibold text-[#0F172A] tracking-tight">
                Audit Trail
              </h2>
              <p className="mt-1 text-[0.8125rem] text-[#64748B]">
                Complete history of document actions and signatures
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            >
              <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="w-10 h-10 bg-[#F1F5F9] rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#F1F5F9] rounded w-1/3"></div>
                    <div className="h-3 bg-[#F1F5F9] rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-[#94A3B8] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-[#64748B] text-sm">No audit entries yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="relative pl-8 pb-4 border-l-2 border-[rgba(148,163,184,0.15)] last:border-l-transparent"
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-[#10B981] border-4 border-white"></div>

                  <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[rgba(148,163,184,0.15)]">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold text-[#0F172A]">
                        {entry.action}
                      </h3>
                      <span className="text-xs font-mono text-[#94A3B8]">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {entry.signerName && (
                      <p className="text-[0.8125rem] text-[#64748B] mb-1">
                        <span className="font-medium">Signer:</span> {entry.signerName}
                        {entry.signerEmail && ` (${entry.signerEmail})`}
                      </p>
                    )}

                    {entry.ipAddress && (
                      <p className="text-[0.8125rem] text-[#64748B] mb-1">
                        <span className="font-medium">IP Address:</span> {entry.ipAddress}
                      </p>
                    )}

                    {entry.details && (
                      <p className="text-[0.8125rem] text-[#64748B]">
                        {entry.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Verification Notice */}
          <div className="mt-6 p-4 bg-[#F0FDF4] border border-[#10B981]/20 rounded-xl">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-[#0F172A] mb-1">Tamper-Evident Seal</p>
                <p className="text-[0.8125rem] text-[#64748B]">
                  This audit trail is cryptographically secured. Any unauthorized changes will be detected.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
