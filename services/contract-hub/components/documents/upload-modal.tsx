'use client';

import { useState, useCallback, useRef } from 'react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_FILE_SIZE = 40 * 1024 * 1024; // 40MB

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

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('contract');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setFile(null);
    setTitle('');
    setDocumentType('contract');
    setDescription('');
    setTags('');
    setUploading(false);
    setProgress(0);
    setError(null);
    setIsDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    if (!uploading) {
      resetForm();
      onClose();
    }
  }, [uploading, resetForm, onClose]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setError(null);
    
    // Validate file type
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError('Invalid file type. Only PDF, DOCX, DOC, TXT, and XLSX files are allowed.');
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size exceeds 40MB limit.');
      return;
    }

    setFile(selectedFile);
    // Auto-populate title from filename (without extension)
    const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
    setTitle(fileName);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a document title');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('documentType', documentType);
      if (description.trim()) formData.append('description', description.trim());
      if (tags.trim()) formData.append('tags', tags.trim());
      formData.append('status', 'active');

      setProgress(40);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      setProgress(90);

      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.error || `Upload failed (HTTP ${res.status})`);
      }

      setProgress(100);
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }, [file, title, documentType, description, tags, onSuccess, handleClose]);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
              <h2 className="text-[1.125rem] font-semibold text-[#0F172A] tracking-tight">Upload Document</h2>
              <p className="mt-1 text-[0.8125rem] text-[#64748B]">Stored in SharePoint when configured, otherwise on persistent storage</p>
            </div>
            <button
              onClick={handleClose}
              disabled={uploading}
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
          {/* File Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              isDragOver
                ? 'border-[#10B981] bg-[#F0FDF4]'
                : file
                ? 'border-[#10B981] bg-[#F0FDF4]/50'
                : 'border-[rgba(148,163,184,0.3)] hover:border-[#10B981] hover:bg-[#F8FAFC]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.xlsx"
              onChange={handleInputChange}
              className="hidden"
            />
            
            {file ? (
              <div className="space-y-2">
                <svg className="w-12 h-12 mx-auto text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[0.875rem] font-medium text-[#0F172A]">{file.name}</p>
                <p className="text-[0.75rem] font-mono text-[#64748B]">{formatFileSize(file.size)}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setTitle('');
                  }}
                  disabled={uploading}
                  className="text-[0.75rem] text-[#10B981] hover:underline disabled:opacity-50"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <svg className="w-12 h-12 mx-auto text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div>
                  <p className="text-[0.875rem] font-medium text-[#0F172A]">
                    Drop your file here, or <span className="text-[#10B981]">browse</span>
                  </p>
                  <p className="text-[0.75rem] text-[#64748B] mt-1">PDF, DOCX, DOC, TXT, XLSX (max 40MB)</p>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Form */}
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
                disabled={uploading}
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
                disabled={uploading}
                className="w-full rounded-xl border border-[rgba(148,163,184,0.3)] px-4 py-2.5 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
                disabled={uploading}
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
                disabled={uploading}
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

          {/* Progress Bar */}
          {uploading && progress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[0.75rem]">
                <span className="text-[#64748B]">Uploading...</span>
                <span className="font-mono text-[#0F172A]">{progress}%</span>
              </div>
              <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#10B981] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[rgba(148,163,184,0.15)] px-6 py-4 rounded-b-[1.25rem]">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="px-5 py-2.5 text-sm font-medium text-[#0F172A] border border-[rgba(148,163,184,0.3)] rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !file || !title.trim()}
              className="group inline-flex items-center gap-2 px-5 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-full hover:bg-[#059669] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Document
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
