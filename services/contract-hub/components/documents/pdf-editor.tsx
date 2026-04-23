/**
 * PDF Editor Component
 * Full-featured PDF editor with annotations, signatures, and text editing
 * Uses pdf-lib for PDF manipulation
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import PDFViewer from './pdf-viewer';
import SignatureModal from './signature-modal';

interface PDFEditorProps {
  documentId?: string;
  fileUrl: string;
  onSave?: (pdfBytes: Uint8Array) => void;
  className?: string;
}

type ToolType = 'select' | 'text' | 'highlight' | 'signature' | 'note' | 'stamp';

interface Annotation {
  id: string;
  type: ToolType;
  page: number;
  x: number;
  y: number;
  content?: string;
  color?: string;
  signatureDataUrl?: string;
}

export default function PDFEditor({ fileUrl, onSave, className = '' }: PDFEditorProps) {
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [, setTotalPages] = useState(1);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Load PDF document
  useEffect(() => {
    const loadPDF = async () => {
      try {
        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        setPdfDoc(pdf);
      } catch (error) {
        console.error('Failed to load PDF:', error);
      }
    };

    if (fileUrl) {
      loadPDF();
    }
  }, [fileUrl]);

  const addToHistory = useCallback((newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  const handleAddText = useCallback((x: number, y: number) => {
    const text = prompt('Enter text:');
    if (!text) return;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'text',
      page: currentPage,
      x,
      y,
      content: text,
      color: '#0F172A',
    };

    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
  }, [currentPage, annotations, addToHistory]);

  const handleAddHighlight = useCallback((x: number, y: number) => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'highlight',
      page: currentPage,
      x,
      y,
      color: '#FEF08A',
    };

    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
  }, [currentPage, annotations, addToHistory]);

  const handleAddNote = useCallback((x: number, y: number) => {
    const note = prompt('Enter note:');
    if (!note) return;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'note',
      page: currentPage,
      x,
      y,
      content: note,
      color: '#60A5FA',
    };

    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
  }, [currentPage, annotations, addToHistory]);

  const handleAddSignature = useCallback((signatureDataUrl: string) => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'signature',
      page: currentPage,
      x: 100,
      y: 100,
      signatureDataUrl,
    };

    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
    setShowSignatureModal(false);
  }, [currentPage, annotations, addToHistory]);

  const handleSave = useCallback(async () => {
    if (!pdfDoc) return;

    setSaving(true);
    try {
      // Apply all annotations to PDF
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const annotation of annotations) {
        const page = pages[annotation.page - 1];
        if (!page) continue;

        const { height } = page.getSize();

        switch (annotation.type) {
          case 'text':
            page.drawText(annotation.content || '', {
              x: annotation.x,
              y: height - annotation.y,
              size: 12,
              font,
              color: rgb(0, 0, 0),
            });
            break;

          case 'highlight':
            page.drawRectangle({
              x: annotation.x,
              y: height - annotation.y - 20,
              width: 200,
              height: 20,
              color: rgb(0.99, 0.94, 0.54),
              opacity: 0.5,
            });
            break;

          case 'note':
            page.drawCircle({
              x: annotation.x,
              y: height - annotation.y,
              size: 15,
              color: rgb(0.38, 0.65, 0.96),
            });
            break;

          case 'signature':
            if (annotation.signatureDataUrl) {
              const signatureImage = await pdfDoc.embedPng(annotation.signatureDataUrl);
              page.drawImage(signatureImage, {
                x: annotation.x,
                y: height - annotation.y - 80,
                width: 200,
                height: 80,
              });
            }
            break;
        }
      }

      const pdfBytes = await pdfDoc.save();
      onSave?.(pdfBytes);
    } catch (error) {
      console.error('Failed to save PDF:', error);
    } finally {
      setSaving(false);
    }
  }, [pdfDoc, annotations, onSave]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'select') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    switch (activeTool) {
      case 'text':
        handleAddText(x, y);
        break;
      case 'highlight':
        handleAddHighlight(x, y);
        break;
      case 'note':
        handleAddNote(x, y);
        break;
      case 'signature':
        setShowSignatureModal(true);
        break;
    }
  }, [activeTool, handleAddText, handleAddHighlight, handleAddNote]);

  const tools: Array<{ id: ToolType; label: string; icon: React.ReactNode }> = [
    {
      id: 'select',
      label: 'Select',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      ),
    },
    {
      id: 'text',
      label: 'Text',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      ),
    },
    {
      id: 'highlight',
      label: 'Highlight',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
    },
    {
      id: 'signature',
      label: 'Signature',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
    },
    {
      id: 'note',
      label: 'Note',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`flex h-screen bg-[#F8FAFC] ${className}`}>
      {/* Toolbar */}
      <div className="w-16 bg-white border-r border-[rgba(148,163,184,0.15)] flex flex-col items-center py-4 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.95] ${
              activeTool === tool.id
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
            }`}
          >
            {tool.icon}
          </button>
        ))}

        <div className="w-8 h-px bg-[rgba(148,163,184,0.15)] my-2" />

        {/* Undo/Redo */}
        <button
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className="w-12 h-12 flex items-center justify-center rounded-xl text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
          </svg>
        </button>

        <button
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
          className="w-12 h-12 flex items-center justify-center rounded-xl text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
          </svg>
        </button>

        <div className="flex-1" />

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || annotations.length === 0}
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#10B981] text-white hover:bg-[#059669] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save"
        >
          {saving ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          )}
        </button>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden" onClick={handleCanvasClick}>
        <PDFViewer
          fileUrl={fileUrl}
          currentPage={currentPage}
          onPageChange={(page, total) => {
            setCurrentPage(page);
            setTotalPages(total);
          }}
        />
      </div>

      {/* Annotations Panel */}
      {annotations.length > 0 && (
        <div className="w-72 bg-white border-l border-[rgba(148,163,184,0.15)] overflow-y-auto">
          <div className="p-4 border-b border-[rgba(148,163,184,0.15)]">
            <h3 className="text-sm font-semibold text-[#0F172A]">
              Annotations ({annotations.length})
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {annotations.map((annotation) => (
              <div
                key={annotation.id}
                className="p-3 bg-[#F8FAFC] rounded-xl border border-[rgba(148,163,184,0.15)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-[#10B981] uppercase">
                    {annotation.type}
                  </span>
                  <span className="text-xs text-[#94A3B8]">Page {annotation.page}</span>
                </div>
                {annotation.content && (
                  <p className="text-sm text-[#0F172A]">{annotation.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureModal
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSave={handleAddSignature}
        />
      )}
    </div>
  );
}
