/**
 * Template Browser Page
 * Browse and select legal document templates
 * AI-powered document generation interface
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { templateLibrary, type LegalTemplate, type TemplateCategory } from '@/lib/services/template-library';
import TemplateForm from '@/components/documents/template-form';

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<LegalTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);

  const templates = useMemo(() => {
    const filtered = selectedCategory === 'all'
      ? templateLibrary.getAllTemplates()
      : templateLibrary.getAllTemplates(selectedCategory);

    return searchQuery
      ? templateLibrary.searchTemplates(searchQuery)
      : filtered;
  }, [selectedCategory, searchQuery]);

  const categories = templateLibrary.getCategories();

  const handleTemplateSelect = useCallback((template: LegalTemplate) => {
    setSelectedTemplate(template);
    setShowForm(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setSelectedTemplate(null);
  }, []);

  const handleDocumentGenerated = useCallback((documentId: string) => {
    router.push(`/dashboard/documents/${documentId}/edit`);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-[rgba(148,163,184,0.15)]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#10B981]/10 text-[#10B981]">
              AI-Powered
            </span>
          </div>
          <h1 className="text-[2rem] font-bold text-[#0F172A] tracking-tight mb-2">
            Legal Document Templates
          </h1>
          <p className="text-[1.0625rem] text-[#64748B]">
            Generate professional legal documents from curated templates using AI
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-12 pr-4 py-3 border border-[rgba(148,163,184,0.3)] rounded-xl text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
                selectedCategory === 'all'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-white text-[#0F172A] border border-[rgba(148,163,184,0.3)] hover:border-[#10B981]'
              }`}
            >
              All Templates
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
                  selectedCategory === cat.id
                    ? 'bg-[#10B981] text-white'
                    : 'bg-white text-[#0F172A] border border-[rgba(148,163,184,0.3)] hover:border-[#10B981]'
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto text-[#94A3B8] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No templates found</h3>
            <p className="text-[#64748B]">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="group bg-white rounded-[1.25rem] p-6 border border-[rgba(148,163,184,0.15)] hover:border-[#10B981] hover:shadow-[0_4px_16px_rgba(16,185,129,0.1)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] text-left"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-[1.0625rem] font-semibold text-[#0F172A] group-hover:text-[#10B981] transition-colors duration-300">
                    {template.name}
                  </h3>
                  {template.plainLanguage && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0FDF4] text-[#059669]">
                      Plain Language
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-[0.875rem] text-[#64748B] mb-4 line-clamp-2">
                  {template.description}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-3 text-[0.75rem] text-[#94A3B8] mb-4">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    ~{template.estimatedPages} pages
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {template.fields.length} fields
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F8FAFC] text-[#64748B]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <div className="mt-4 pt-4 border-t border-[rgba(148,163,184,0.15)] flex items-center justify-between">
                  <span className="text-[0.8125rem] text-[#10B981] font-medium">
                    Generate with AI
                  </span>
                  <svg className="w-5 h-5 text-[#10B981] group-hover:translate-x-1 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Template Form Modal */}
      {showForm && selectedTemplate && (
        <TemplateForm
          template={selectedTemplate}
          isOpen={showForm}
          onClose={handleFormClose}
          onSuccess={handleDocumentGenerated}
        />
      )}
    </div>
  );
}
