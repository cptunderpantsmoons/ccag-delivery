/**
 * PDF Viewer Component
 * Renders PDF documents using PDF.js
 * Provides zoom, navigation, and fullscreen controls
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  fileUrl: string;
  currentPage?: number;
  onPageChange?: (page: number, total: number) => void;
  className?: string;
}

export default function PDFViewer({ fileUrl, currentPage: externalPage, onPageChange, className = '' }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [internalPage, setInternalPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentPage = externalPage ?? internalPage;

  // Load PDF document
  useEffect(() => {
    if (!fileUrl) return;

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load PDF:', err);
        setError('Failed to load PDF document');
        setLoading(false);
      }
    };

    loadPDF();
  }, [fileUrl]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom * 1.5 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // @ts-expect-error: types expect 'canvas' property but runtime API uses canvasContext
        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        onPageChange?.(currentPage, totalPages);
      } catch (err) {
        console.error('Failed to render page:', err);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, zoom, totalPages, onPageChange]);

  const goToPage = useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setInternalPage(newPage);
  }, [totalPages]);

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3.0));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-white rounded-xl border border-[rgba(148,163,184,0.15)] ${className}`}>
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-[#94A3B8] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[#0F172A] font-medium mb-2">Failed to load PDF</p>
          <p className="text-[#64748B] text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative bg-[#F1F5F9] rounded-xl overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-[rgba(148,163,184,0.15)] px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] rounded-lg">
              <input
                type="number"
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value))}
                min={1}
                max={totalPages}
                className="w-12 text-center text-sm font-mono bg-transparent focus:outline-none text-[#0F172A]"
              />
              <span className="text-sm text-[#64748B]">/ {totalPages || '?'}</span>
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Center: Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              disabled={zoom <= 0.5 || loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>

            <span className="text-sm font-mono text-[#0F172A] min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={zoomIn}
              disabled={zoom >= 3.0 || loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            >
              <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isFullscreen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.9M9 9l4.5-4.5M9 9L4.5 4.5M15 15v4.1M15 15l-4.5 4.5M15 15l4.5 4.5" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="overflow-auto p-8 flex justify-center">
        {loading ? (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto text-[#94A3B8] animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-[#64748B] text-sm">Loading PDF...</p>
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="shadow-lg bg-white"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        )}
      </div>
    </div>
  );
}
