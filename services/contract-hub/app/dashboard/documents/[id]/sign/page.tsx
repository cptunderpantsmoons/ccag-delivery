/**
 * Document Signing Interface
 * Allows users to sign documents with full audit trail
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import SignatureModal from '@/components/documents/signature-modal';
import AuditTrail from '@/components/documents/audit-trail';
import PDFViewer from '@/components/documents/pdf-viewer';
import { documentsApi } from '@/lib/api';

export default function DocumentSigningPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [doc, setDoc] = useState<{
    title: string | null;
    sharepointWebUrl: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        const result = await documentsApi.get(documentId);
        if (result.success && result.data) {
          setDoc(result.data);
        }
      } catch (err) {
        console.error('Failed to load document:', err);
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  const handleSign = useCallback(async (sigDataUrl: string) => {
    setSignatureDataUrl(sigDataUrl);
    setShowSignatureModal(false);
  }, []);

  const handleSubmitSignature = useCallback(async () => {
    if (!signatureDataUrl) return;

    setSigning(true);
    try {
      // Call API to save signature with audit trail
      // POST /api/documents/[id]/sign
      const response = await fetch(`/api/documents/${documentId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureDataUrl,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSigned(true);
      }
    } catch (err) {
      console.error('Failed to submit signature:', err);
    } finally {
      setSigning(false);
    }
  }, [documentId, signatureDataUrl]);

  const handleBack = useCallback(() => {
    router.push('/dashboard/documents');
  }, [router]);

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

  if (!doc) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#0F172A] font-medium mb-4">Document not found</p>
          <button onClick={handleBack} className="px-4 py-2 bg-[#10B981] text-white text-sm font-medium rounded-full">
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
                    Sign Document
                  </h1>
                  {signed && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F0FDF4] text-[#059669]">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Signed
                    </span>
                  )}
                </div>
                <p className="text-[0.8125rem] text-[#64748B]">
                  {doc.title} • Review carefully before signing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAuditTrail(true)}
                className="px-4 py-2 border border-[rgba(148,163,184,0.3)] text-[#0F172A] text-sm font-medium rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              >
                View Audit Trail
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-6 p-6">
        {/* PDF Viewer */}
        <div className="flex-1">
          <PDFViewer
            fileUrl={doc.sharepointWebUrl || `/api/documents/${documentId}/download`}
          />
        </div>

        {/* Signing Panel */}
        <div className="w-96">
          <div className="bg-white rounded-[1.25rem] border border-[rgba(148,163,184,0.15)] p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4">
              {signed ? 'Document Signed' : 'Add Your Signature'}
            </h2>

            {signed ? (
              <div className="space-y-4">
                <div className="p-4 bg-[#F0FDF4] border border-[#10B981]/20 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-6 h-6 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-[#0F172A]">Successfully Signed</span>
                  </div>
                  <p className="text-[0.8125rem] text-[#64748B]">
                    Your signature has been recorded with a complete audit trail.
                  </p>
                </div>

                {signatureDataUrl && (
                  <div className="p-4 border border-[rgba(148,163,184,0.15)] rounded-xl bg-white">
                    <p className="text-xs text-[#64748B] mb-2">Your Signature:</p>
                    <div className="max-h-20 mx-auto relative">
                      <Image src={signatureDataUrl} alt="Signature" fill className="object-contain" />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => router.push('/dashboard/documents')}
                  className="w-full px-4 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-full hover:bg-[#059669] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                >
                  Back to Documents
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-[#0F172A] mb-1">Legal Notice</p>
                      <p className="text-[0.8125rem] text-[#92400E]">
                        By signing this document, you agree to all terms and conditions. This signature is legally binding.
                      </p>
                    </div>
                  </div>
                </div>

                {signatureDataUrl && (
                  <div className="p-4 border border-[rgba(148,163,184,0.15)] rounded-xl bg-white">
                    <p className="text-xs text-[#64748B] mb-2">Preview:</p>
                    <div className="max-h-20 mx-auto relative">
                      <Image src={signatureDataUrl} alt="Signature preview" fill className="object-contain" />
                    </div>
                    <button
                      onClick={() => setSignatureDataUrl(null)}
                      className="mt-2 text-xs text-[#10B981] hover:underline"
                    >
                      Remove and re-sign
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setShowSignatureModal(true)}
                  className="w-full px-4 py-2.5 border-2 border-dashed border-[rgba(148,163,184,0.3)] text-[#64748B] text-sm font-medium rounded-xl hover:border-[#10B981] hover:text-[#10B981] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                >
                  {signatureDataUrl ? 'Change Signature' : 'Click to Sign'}
                </button>

                <button
                  onClick={handleSubmitSignature}
                  disabled={!signatureDataUrl || signing}
                  className="w-full px-4 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-full hover:bg-[#059669] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {signing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing...
                    </span>
                  ) : (
                    'Confirm & Sign Document'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureModal
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSave={handleSign}
          signerName="Current User"
        />
      )}

      {/* Audit Trail Modal */}
      {showAuditTrail && (
        <AuditTrail
          documentId={documentId}
          isOpen={showAuditTrail}
          onClose={() => setShowAuditTrail(false)}
        />
      )}
    </div>
  );
}
