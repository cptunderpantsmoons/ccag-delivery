'use client';

import { useState, useEffect, useCallback } from 'react';
import { documentsApi, type Document } from '@/lib/api';

interface DeleteModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteModal({ documentId, isOpen, onClose, onSuccess }: DeleteModalProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteFromSharePoint, setDeleteFromSharePoint] = useState(false);

  const loadDocument = useCallback(async () => {
    if (!documentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await documentsApi.get(documentId);
      if (result.success && result.data) {
        setDocument(result.data);
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
    setError(null);
    setDeleteFromSharePoint(false);
  }, []);

  const handleClose = useCallback(() => {
    if (!deleting) {
      resetForm();
      onClose();
    }
  }, [deleting, resetForm, onClose]);

  const handleDelete = useCallback(async () => {
    if (!document) return;

    setDeleting(true);
    setError(null);

    try {
      // Delete from SharePoint if requested and SharePoint ID exists
      if (deleteFromSharePoint && document.sharepointItemId && document.sharepointLibraryId) {
        const { sharepointApi } = await import('@/lib/api');
        try {
          await sharepointApi.deleteFile(document.sharepointLibraryId!, document.sharepointItemId!);
        } catch (spError) {
          console.warn('Failed to delete from SharePoint:', spError);
          // Continue with metadata deletion even if SharePoint deletion fails
        }
      }

      // Delete metadata record
      await documentsApi.delete(documentId);

      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Failed to delete document:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  }, [document, documentId, deleteFromSharePoint, onSuccess, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-[1.25rem] shadow-[0_4px_16px_rgba(0,0,0,0.05),0_16px_48px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in-95 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
        {/* Content */}
        <div className="px-6 py-6">
          {/* Warning Icon */}
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#FEF2F2] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#B91C1C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-[1.125rem] font-semibold text-[#0F172A] text-center tracking-tight mb-2">
            Delete Document
          </h3>
          <p className="text-[0.8125rem] text-[#64748B] text-center mb-6">
            Are you sure you want to delete this document? This action cannot be undone.
          </p>

          {loading ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="skeleton w-48 h-4 rounded-full" />
              <div className="skeleton w-56 h-3 rounded" />
            </div>
          ) : document ? (
            <div className="space-y-4">
              {/* Document Info */}
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[rgba(148,163,184,0.15)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[0.75rem] font-medium text-[#64748B]">Title</span>
                  <span className="text-[0.75rem] font-medium text-[#0F172A]">{document.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.75rem] font-medium text-[#64748B]">File</span>
                  <span className="text-[0.75rem] font-mono text-[#0F172A]">{document.fileName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.75rem] font-medium text-[#64748B]">Type</span>
                  <span className="text-[0.75rem] text-[#0F172A]">{document.documentType}</span>
                </div>
              </div>

              {/* SharePoint Option */}
              {document.sharepointItemId && (
                <label className="flex items-start gap-3 p-3 rounded-xl border border-[rgba(148,163,184,0.2)] cursor-pointer hover:bg-[#F8FAFC] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  <input
                    type="checkbox"
                    checked={deleteFromSharePoint}
                    onChange={(e) => setDeleteFromSharePoint(e.target.checked)}
                    disabled={deleting}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-[0.8125rem] font-medium text-[#0F172A]">
                      Also delete from SharePoint
                    </p>
                    <p className="text-[0.6875rem] text-[#64748B] mt-0.5">
                      This will permanently remove the file from SharePoint
                    </p>
                  </div>
                </label>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] text-sm rounded-xl border border-[rgba(252,165,165,0.3)]">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center gap-3">
              <svg className="w-12 h-12 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[0.875rem] font-medium text-[#0F172A]">Document not found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[rgba(148,163,184,0.15)] px-6 py-4 rounded-b-[1.25rem]">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={deleting}
              className="px-5 py-2.5 text-sm font-medium text-[#0F172A] border border-[rgba(148,163,184,0.3)] rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting || loading || !document}
              className="group inline-flex items-center gap-2 px-5 py-2.5 bg-[#B91C1C] text-white text-sm font-medium rounded-full hover:bg-[#991B1B] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Document
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
