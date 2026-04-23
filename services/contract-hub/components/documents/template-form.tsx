/**
 * Template Form Modal
 * Dynamic form for filling template fields
 * AI-assisted document generation
 */

'use client';

import { useState, useCallback } from 'react';
import type { LegalTemplate, TemplateField } from '@/lib/services/template-library';

interface TemplateFormProps {
  template: LegalTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (documentId: string) => void;
}

export default function TemplateForm({ template, isOpen, onClose, onSuccess }: TemplateFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Clear error when user types
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }, [errors]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    template.fields.forEach(field => {
      if (field.required && !formData[field.name]?.trim()) {
        newErrors[field.name] = 'This field is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [template.fields, formData]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setGenerating(true);
    setError(null);
    setProgress(10);

    let progressInterval: ReturnType<typeof setInterval> | null = null;
    try {
      // Simulate progress
      progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch('/api/ai/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          inputs: formData,
          useAI: true,
        }),
      });

      clearInterval(progressInterval);
      progressInterval = null;
      setProgress(100);

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate document');
      }

      // Redirect to generated document
      if (result.data?.id) {
        onSuccess(result.data.id);
      } else {
        onSuccess('new');
      }
    } catch (err) {
      console.error('Document generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate document');
      setProgress(0);
    } finally {
      if (progressInterval !== null) clearInterval(progressInterval);
      setGenerating(false);
    }
  }, [template.id, formData, validateForm, onSuccess]);

  const handleClose = useCallback(() => {
    if (!generating) {
      onClose();
    }
  }, [generating, onClose]);

  if (!isOpen) return null;

  const renderField = (field: TemplateField) => {
    const value = formData[field.name] || '';
    const hasError = errors[field.name];

    const baseInputClass = `w-full px-4 py-2.5 border rounded-xl text-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:outline-none focus:ring-2 ${
      hasError
        ? 'border-[#B91C1C] focus:border-[#B91C1C] focus:ring-[#B91C1C]/20'
        : 'border-[rgba(148,163,184,0.3)] focus:border-[#10B981] focus:ring-[#10B981]/20'
    } disabled:opacity-50`;

    switch (field.type) {
      case 'text':
      case 'party_name':
      case 'email':
      case 'phone':
        return (
          <input
            key={field.name}
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={generating}
            className={baseInputClass}
          />
        );

      case 'date':
        return (
          <input
            key={field.name}
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            disabled={generating}
            className={baseInputClass}
          />
        );

      case 'amount':
        return (
          <input
            key={field.name}
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={generating}
            className={`${baseInputClass} font-mono`}
          />
        );

      case 'duration':
      case 'percentage':
        return (
          <input
            key={field.name}
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={generating}
            className={baseInputClass}
          />
        );

      case 'address':
        return (
          <textarea
            key={field.name}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            disabled={generating}
            className={`${baseInputClass} resize-y`}
          />
        );

      case 'select':
        return (
          <select
            key={field.name}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            disabled={generating}
            className={baseInputClass}
          >
            <option value="">{field.placeholder}</option>
            <option value="New South Wales">New South Wales</option>
            <option value="Victoria">Victoria</option>
            <option value="Queensland">Queensland</option>
            <option value="Western Australia">Western Australia</option>
            <option value="South Australia">South Australia</option>
            <option value="Tasmania">Tasmania</option>
            <option value="Australian Capital Territory">ACT</option>
            <option value="Northern Territory">Northern Territory</option>
          </select>
        );

      default:
        return (
          <input
            key={field.name}
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={generating}
            className={baseInputClass}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-[1.25rem] shadow-[0_4px_16px_rgba(0,0,0,0.05),0_16px_48px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in-95 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[rgba(148,163,184,0.15)] px-6 py-5 rounded-t-[1.25rem]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#10B981]/10 text-[#10B981]">
                  {template.category.toUpperCase()}
                </span>
                {template.plainLanguage && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0FDF4] text-[#059669]">
                    Plain Language
                  </span>
                )}
              </div>
              <h2 className="text-[1.25rem] font-semibold text-[#0F172A] tracking-tight">
                {template.name}
              </h2>
              <p className="mt-1 text-[0.8125rem] text-[#64748B]">
                {template.description}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={generating}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            >
              <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Info Box */}
          <div className="p-4 bg-[#F0FDF4] border border-[#10B981]/20 rounded-xl">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-[#0F172A] mb-1">AI-Powered Generation</p>
                <p className="text-[0.8125rem] text-[#64748B]">
                  Fill in the required fields below. AI will generate a complete legal document based on this template and your inputs.
                </p>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-5">
            {template.fields.map((field) => (
              <div key={field.name}>
                <label className="block text-[0.8125rem] font-medium text-[#0F172A] mb-1.5">
                  {field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  {field.required && <span className="text-[#B91C1C] ml-1">*</span>}
                </label>
                {renderField(field)}
                {field.description && (
                  <p className="mt-1 text-[0.75rem] text-[#94A3B8]">{field.description}</p>
                )}
                {errors[field.name] && (
                  <p className="mt-1 text-[0.75rem] text-[#B91C1C]">{errors[field.name]}</p>
                )}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] text-sm rounded-xl border border-[rgba(252,165,165,0.3)]">
              {error}
            </div>
          )}

          {/* Progress */}
          {generating && progress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[0.75rem]">
                <span className="text-[#64748B]">Generating document...</span>
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
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={generating}
              className="px-5 py-2.5 border border-[rgba(148,163,184,0.3)] text-[#0F172A] text-sm font-medium rounded-full hover:bg-[#F8FAFC] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={generating}
              className="group inline-flex items-center gap-2 px-5 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-full hover:bg-[#059669] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Document
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
