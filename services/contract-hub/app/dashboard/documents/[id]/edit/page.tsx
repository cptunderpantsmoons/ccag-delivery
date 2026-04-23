/**
 * Document Editor Page
 * Full-screen document editing interface
 * Integrates PDF editor with metadata and actions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PDFEditor from '@/components/documents/pdf-editor';
import { documentsApi } from '@/lib/api';
import { Clock, Loader2, AlertTriangle, CheckCircle, FileText, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/toast';
import type { Document } from '@/lib/api';

export default function DocumentEditorPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;
  const { toast } = useToast();

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        const result = await documentsApi.get(documentId);
        if (result.success && result.data) {
          setDoc(result.data);
        } else {
          setError('Failed to load document');
        }
      } catch (err) {
        console.error('Failed to load document:', err);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  const handleSave = useCallback(async (pdfBytes: Uint8Array) => {
    setSaving(true);
    try {
      // Upload edited PDF to backend API
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: pdfBytes.buffer as ArrayBuffer,
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      // Trigger download of the updated document
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${doc?.title || 'document'}_edited.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to save document:', err);
    } finally {
      setSaving(false);
    }
  }, [documentId, doc]);

  const handleBack = useCallback(() => {
    router.push('/dashboard/documents');
  }, [router]);

  const handleReindex = useCallback(async () => {
    if (!doc) return;
    setReindexing(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/reindex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        toast({ title: 'Re-indexing started', description: 'This may take a few minutes.', variant: 'success' });
        // Update the local status to reflect indexing in progress
        setDoc(prev => prev ? { ...prev, vectorIndexStatus: 'indexing' } : null);
      } else {
        const data = await res.json();
        toast({ title: 'Re-indexing failed', description: data.error || 'Failed to start re-indexing', variant: 'error' });
      }
    } catch {
      toast({ title: 'Re-indexing failed', description: 'Failed to start re-indexing', variant: 'error' });
    } finally {
      setReindexing(false);
    }
  }, [documentId, doc, toast]);

  // Index status badge component
  const IndexStatusBadge = ({ status, error, indexedAt }: {
    status: string | null;
    error: string | null;
    indexedAt: string | null;
  }) => {
    if (!status || status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
          <Clock className="w-3.5 h-3.5" />
          Pending
        </span>
      );
    }
    if (status === 'indexing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Indexing
        </span>
      );
    }
    if (status === 'extraction_failed' || status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium" title={error || 'Indexing failed'}>
          <AlertTriangle className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    }
    if (status === 'indexed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
          <CheckCircle className="w-3.5 h-3.5" />
          Indexed
          {indexedAt && <span className="text-green-600/80">{format(new Date(indexedAt), 'MMM d')}</span>}
        </span>
      );
    }
    if (status === 'extracted') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
          <FileText className="w-3.5 h-3.5" />
          Extracted
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto text-[#94A3B8] animate-spin mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-[#64748B]">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-[#94A3B8] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[#0F172A] font-medium mb-2">Failed to load document</p>
          <p className="text-[#64748B] text-sm mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-[#10B981] text-white text-sm font-medium rounded-full hover:bg-[#059669] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-[rgba(148,163,184,0.15)]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              >
                <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-[1.25rem] font-semibold text-[#0F172A] tracking-tight">
                    {doc.title}
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#10B981]/10 text-[#10B981]">
                    {doc.documentType}
                  </span>
                </div>
                <p className="text-[0.8125rem] text-[#64748B]">
                  Editing document • Last modified {new Date(doc.updatedAt || '').toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Vector Index Status Card */}
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-[rgba(148,163,184,0.2)] bg-[#F8FAFC]">
                <div className="flex flex-col">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[#64748B] mb-1">
                    Vector Index
                  </span>
                  <div className="flex items-center gap-2">
                    <IndexStatusBadge
                      status={doc.vectorIndexStatus}
                      error={doc.vectorIndexError}
                      indexedAt={doc.vectorIndexedAt}
                    />
                    {doc.vectorIndexedAt && (
                      <span className="text-[0.6875rem] text-[#94A3B8]">
                        {format(new Date(doc.vectorIndexedAt), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                  {doc.vectorIndexError && (
                    <p className="mt-1.5 text-[0.6875rem] text-red-600 bg-red-50 px-2 py-1 rounded-md">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      {doc.vectorIndexError}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleReindex}
                  disabled={reindexing}
                  className="ml-2 px-3 py-1.5 text-xs font-medium bg-[#10B981] text-white rounded-lg hover:bg-[#059669] disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  title="Re-index document for AI search"
                >
                  {reindexing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Indexing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Re-index
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => router.push(`/dashboard/documents/${documentId}/sign`)}
                className="px-4 py-2 border border-[rgba(148,163,184,0.3)] text-[#0F172A] text-sm font-medium rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              >
                Request Signature
              </button>
              {saving && (
                <span className="text-sm text-[#64748B] flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Editor */}
      <PDFEditor
        documentId={documentId}
        fileUrl={doc.sharepointWebUrl || `/api/documents/${documentId}/download`}
        onSave={handleSave}
      />
    </div>
  );
}
