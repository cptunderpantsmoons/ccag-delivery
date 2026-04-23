'use client';

import { useState, useEffect, useCallback } from 'react';
import { documentsApi, type Document, type CreateDocumentInput } from '@/lib/api';

interface EditModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DOCUMENT_TYPES = [
  'contract',
  'legal_opinion',
  'policy',
  'template',
  'correspondence',
  'nda',
  'msa',
  'sow',
  'amendment',
  'other',
] as const;

const STATUS_OPTIONS = ['active', 'review', 'draft', 'archived'] as const;

export default function EditModal({ documentId, isOpen, onClose, onSuccess }: EditModalProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('contract');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = useCallback(async () => {
    if (!documentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await documentsApi.get(documentId);
      if (result.success && result.data) {
        setDocument(result.data);
        setTitle(result.data.title);
        setDocumentType(result.data.documentType);
        setDescription(result.data.description || '');
        setTags(Array.isArray(result.data.tags) ? result.data.tags.join(', ') : '');
        setStatus(result.data.status);
      } else {
        setError(result.error || 'Failed to load document');
      }
    } catch (err) {
      console.error('Failed to load document:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen && documentId) {
      loadDocument();
    }
  }, [isOpen, documentId, loadDocument]);

  const resetForm = useCallback(() => {
    setDocument(null);
    setTitle('');
    setDocumentType('contract');
    setDescription('');
    setTags('');
    setStatus('active');
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (!saving) {
      resetForm();
      onClose();
    }
  }, [saving, resetForm, onClose]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError('Please enter a document title');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updateData: Partial<CreateDocumentInput> = {
        title: title.trim(),
        documentType,
        description: description.trim() || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        status,
      };

      await documentsApi.update(documentId, updateData);

      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Failed to update document:', err);
      setError(err instanceof Error ? err.message : 'Failed to update document');
    } finally {
      setSaving(false);
    }
  }, [documentId, title, documentType, description, tags, status, onSuccess, handleClose]);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[1.25rem] shadow-[0_4px_16px_rgba(0,0,0,0.05),0_16px_48px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in-95 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[rgba(148,163,184,0.15)] px-6 py-5 rounded-t-[1.25rem]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[1.125rem] font-semibold text-[#0F172A] tracking-tight">Edit Document</h2>
              <p className="mt-1 text-[0.8125rem] text-[#64748B]">Update document metadata</p>
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
        <div className="px-6 py-5 space-y-5">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <div className="skeleton w-48 h-4 rounded-full" />
              <div className="skeleton w-64 h-3 rounded" />
              <div className="skeleton w-56 h-3 rounded" />
            </div>
          ) : document ? (
            <>
              {/* Read-only Info */}
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[rgba(148,163,184,0.15)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[0.75rem] font-medium text-[#64748B]">File</span>
                  <span className="text-[0.75rem] font-mono text-[#0F172A]">{document.fileName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.75rem] font-medium text-[#64748B]">Size</span>
                  <span className="text-[0.75rem] font-mono text-[#0F172A]">{formatFileSize(document.fileSize)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.75rem] font-medium text-[#64748B]">Created</span>
                  <span className="text-[0.75rem] font-mono text-[#0F172A]">{formatDate(document.createdAt)}</span>
                </div>
                {document.sharepointWebUrl && (
                  <div className="pt-2 border-t border-[rgba(148,163,184,0.15)]">
                    <a 
                      href={document.sharepointWebUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[0.75rem] text-[#10B981] hover:underline inline-flex items-center gap-1"
                    >
                      Open in SharePoint
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                    Title <span className="text-[#B91C1C]">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Document title"
                    disabled={saving}
                    className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
                  />
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                    Document Type <span className="text-[#B91C1C]">*</span>
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    disabled={saving}
                    className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
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
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
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

                {/* Tags */}
                <div>
                  <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="comma, separated, tags"
                    disabled={saving}
                    className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] text-sm rounded-xl border border-[rgba(252,165,165,0.3)]">
                  {error}
                </div>
              )}
            </>
          ) : (
            <div className="py-16 flex flex-col items-center gap-3">
              <svg className="w-12 h-12 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[0.875rem] font-medium text-[#0F172A]">Document not found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[rgba(148,163,184,0.15)] px-6 py-4 rounded-b-[1.25rem]">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={saving || loading}
              className="px-5 py-2.5 text-sm font-medium text-[#0F172A] border border-[rgba(148,163,184,0.3)] rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || !document}
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
                  Save Changes
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
