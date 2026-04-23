/**
 * Signature Modal Component
 * Allows users to draw, type, or upload signatures
 * DESIGN.md compliant styling
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import SignatureCanvas from 'react-signature-canvas';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string, signatureType: 'draw' | 'type' | 'upload') => void;
  signerName?: string;
}

export default function SignatureModal({ isOpen, onClose, onSave, signerName }: SignatureModalProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [mode, setMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [penColor, setPenColor] = useState('#0F172A');

  const handleClear = useCallback(() => {
    sigCanvas.current?.clear();
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSave = useCallback(() => {
    let signatureDataUrl = '';

    if (mode === 'draw') {
      if (sigCanvas.current?.isEmpty()) {
        return;
      }
      signatureDataUrl = sigCanvas.current?.toDataURL() || '';
    } else if (mode === 'type') {
      if (!typedSignature.trim()) return;
      // Convert typed text to image using canvas
      const canvas = document.createElement('canvas');
      if (!canvas) return;
      
      const context = canvas.getContext('2d');
      if (!context) return;
      
      canvas.width = 400;
      canvas.height = 150;
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = '48px "Dancing Script", "Brush Script MT", cursive';
      context.fillStyle = penColor;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
      
      signatureDataUrl = canvas.toDataURL();
    } else if (mode === 'upload') {
      if (!uploadedImage) return;
      signatureDataUrl = uploadedImage;
    }

    if (signatureDataUrl) {
      onSave(signatureDataUrl, mode);
    }
  }, [mode, typedSignature, uploadedImage, penColor, onSave]);

  const handleClose = useCallback(() => {
    handleClear();
    setTypedSignature('');
    setUploadedImage(null);
    onClose();
  }, [handleClear, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[1.25rem] shadow-[0_4px_16px_rgba(0,0,0,0.05),0_16px_48px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in-95 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[rgba(148,163,184,0.15)] px-6 py-5 rounded-t-[1.25rem]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[1.125rem] font-semibold text-[#0F172A] tracking-tight">
                Add Signature
              </h2>
              {signerName && (
                <p className="mt-1 text-[0.8125rem] text-[#64748B]">
                  Signing as: {signerName}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            >
              <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Mode Tabs */}
          <div className="flex gap-2 p-1 bg-[#F8FAFC] rounded-xl">
            {[
              { id: 'draw' as const, label: 'Draw', icon: '✍️' },
              { id: 'type' as const, label: 'Type', icon: '⌨️' },
              { id: 'upload' as const, label: 'Upload', icon: '📤' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
                  mode === tab.id
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Draw Mode */}
          {mode === 'draw' && (
            <div className="space-y-4">
              <div className="border-2 border-[rgba(148,163,184,0.3)] rounded-xl overflow-hidden bg-white">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    className: 'w-full h-48 cursor-crosshair',
                  }}
                  penColor={penColor}
                  backgroundColor="white"
                  minWidth={1.5}
                  maxWidth={3}
                />
              </div>

              {/* Pen Color Selection */}
              <div className="flex items-center gap-3">
                <span className="text-[0.8125rem] text-[#64748B]">Pen color:</span>
                <div className="flex gap-2">
                  {['#0F172A', '#1E40AF', '#B91C1C', '#059669'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setPenColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.95] ${
                        penColor === color ? 'border-[#10B981] scale-110' : 'border-[rgba(148,163,184,0.3)]'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Type Mode */}
          {mode === 'type' && (
            <div className="space-y-4">
              <input
                type="text"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Type your full name"
                className="w-full px-4 py-3 border border-[rgba(148,163,184,0.3)] rounded-xl text-lg focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{ fontFamily: 'inherit' }}
              />

              {/* Preview */}
              {typedSignature && (
                <div className="p-6 border-2 border-[rgba(148,163,184,0.3)] rounded-xl bg-white text-center">
                  <p
                    className="text-4xl"
                    style={{
                      fontFamily: '"Dancing Script", "Brush Script MT", "Segoe Script", cursive',
                      color: penColor,
                    }}
                  >
                    {typedSignature}
                  </p>
                </div>
              )}

              <p className="text-[0.75rem] text-[#64748B]">
                Tip: Install a handwriting font for better results
              </p>
            </div>
          )}

          {/* Upload Mode */}
          {mode === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-[rgba(148,163,184,0.3)] rounded-xl p-8 text-center hover:border-[#10B981] hover:bg-[#F8FAFC] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="signature-upload"
                />
                <label
                  htmlFor="signature-upload"
                  className="cursor-pointer block"
                >
                  <svg className="w-12 h-12 mx-auto text-[#94A3B8] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-[0.875rem] font-medium text-[#0F172A]">
                    Click to upload signature image
                  </p>
                  <p className="text-[0.75rem] text-[#64748B] mt-1">
                    PNG, JPG, or SVG (max 2MB)
                  </p>
                </label>
              </div>

              {uploadedImage && (
                <div className="p-4 border-2 border-[rgba(148,163,184,0.3)] rounded-xl bg-white">
                  <div className="max-h-32 mx-auto relative">
                    <Image src={uploadedImage} alt="Uploaded signature" fill className="object-contain" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-[rgba(148,163,184,0.15)] px-6 py-4 rounded-b-[1.25rem]">
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 border border-[rgba(148,163,184,0.3)] text-[#0F172A] text-sm font-medium rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            >
              Cancel
            </button>
            {mode === 'draw' && (
              <button
                onClick={handleClear}
                className="px-5 py-2.5 border border-[rgba(148,163,184,0.3)] text-[#0F172A] text-sm font-medium rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={
                (mode === 'type' && !typedSignature.trim()) ||
                (mode === 'upload' && !uploadedImage)
              }
              className="px-5 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-full hover:bg-[#059669] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
