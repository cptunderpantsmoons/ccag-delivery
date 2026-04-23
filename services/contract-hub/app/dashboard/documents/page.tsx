'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  ArrowRight,
  Sparkles,
  FileText,
  Pencil,
  PenTool,
  ExternalLink,
  Trash2,
  Search,
  Database,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { documentsApi, type Document } from '@/lib/api';
import UploadModal from '@/components/documents/upload-modal';
import EditModal from '@/components/documents/edit-modal';
import DeleteModal from '@/components/documents/delete-modal';
import { Badge, statusToBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);
  const [indexingDocId, setIndexingDocId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const result = await documentsApi.list({
      type: filter !== 'all' ? filter : undefined,
      search: searchQuery || undefined,
    });
    if (result.success && result.data) {
      setDocuments(result.data);
    }
    setLoading(false);
  }, [filter, searchQuery]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const IndexStatusBadge = ({ status, error, indexedAt }: {
    status: string | null;
    error: string | null;
    indexedAt: string | null;
  }) => {
    if (!status || status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--deep)] text-[var(--text-tertiary)] text-xs">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    }
    if (status === 'indexing') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(107,168,232,0.1)] text-[var(--status-info)] text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          Indexing
        </span>
      );
    }
    if (status === 'extraction_failed' || status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(248,113,113,0.1)] text-[var(--status-error)] text-xs" title={error || 'Indexing failed'}>
          <AlertTriangle className="w-3 h-3" />
          Failed
        </span>
      );
    }
    if (status === 'indexed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(74,222,128,0.1)] text-[var(--status-success)] text-xs">
          <CheckCircle className="w-3 h-3" />
          Indexed
          {indexedAt && <span className="text-[var(--status-success)]/70">{format(new Date(indexedAt), 'MMM d')}</span>}
        </span>
      );
    }
    if (status === 'extracted') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(250,204,21,0.1)] text-[var(--status-warning)] text-xs">
          <FileText className="w-3 h-3" />
          Extracted
        </span>
      );
    }
    return null;
  };

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Manage legal documents stored in SharePoint"
        actions={
          <>
            <Button
              variant="outline_accent"
              onClick={() => router.push('/dashboard/templates')}
            >
              <Sparkles className="h-4 w-4" strokeWidth={2} />
              AI Generate
            </Button>
            <Button variant="primary" onClick={() => setShowUploadModal(true)}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Upload Document
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </span>
            </Button>
          </>
        }
      />

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]"
            strokeWidth={1.75}
          />
          <input
            type="search"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-[0.875rem] text-[var(--text-primary)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[0.875rem] text-[var(--text-primary)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
        >
          <option value="all">All Types</option>
          <option value="contract">Contracts</option>
          <option value="nda">NDAs</option>
          <option value="policy">Policies</option>
          <option value="correspondence">Correspondence</option>
        </select>
      </div>

      {/* Documents Table */}
      <div className="overflow-hidden rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="skeleton h-4 w-48 rounded-full" />
            <div className="skeleton h-3 w-64 rounded" />
            <div className="skeleton h-3 w-56 rounded" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <FileText className="h-12 w-12 text-[var(--text-tertiary)]" strokeWidth={1} />
            <p className="text-[0.875rem] font-medium text-[var(--text-primary)]">No documents found</p>
            <p className="text-[0.8125rem] text-[var(--text-secondary)]">
              Upload a document or adjust your filters
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-2"
              onClick={() => setShowUploadModal(true)}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              Upload Document
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--deep)]">
                  <th className="px-6 py-3.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                    Document
                  </th>
                  <th className="px-6 py-3.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                    Type
                  </th>
                  <th className="px-6 py-3.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                    Size
                  </th>
                  <th className="px-6 py-3.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                    Index
                  </th>
                  <th className="px-6 py-3.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                    Uploaded
                  </th>
                  <th className="px-6 py-3.5 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[var(--deep)]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText
                          className="h-5 w-5 flex-shrink-0 text-[var(--text-tertiary)]"
                          strokeWidth={1.5}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[0.875rem] font-medium text-[var(--text-primary)]">
                            {doc.title}
                          </p>
                          <p className="truncate font-mono text-[0.6875rem] text-[var(--text-secondary)]">
                            {doc.fileName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="in_progress">{doc.documentType}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-[0.8125rem] text-[var(--text-secondary)]">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusToBadgeVariant(doc.status)}>{doc.status}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <IndexStatusBadge 
                        status={doc.vectorIndexStatus} 
                        error={doc.vectorIndexError} 
                        indexedAt={doc.vectorIndexedAt} 
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-[0.8125rem] text-[var(--text-secondary)]">
                      {new Date(doc.createdAt).toLocaleDateString('en-AU')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="icon"
                          size="icon-sm"
                          title="Edit Document"
                          aria-label="Edit Document"
                          onClick={() => router.push(`/dashboard/documents/${doc.id}/edit`)}
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                        <Button
                          variant="icon"
                          size="icon-sm"
                          title="Sign Document"
                          aria-label="Sign Document"
                          onClick={() => router.push(`/dashboard/documents/${doc.id}/sign`)}
                        >
                          <PenTool className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                        <Button
                          variant="icon"
                          size="icon-sm"
                          title="AI Analysis"
                          aria-label="AI Analysis"
                          onClick={() =>
                            router.push(
                              `/dashboard/ai?entityType=document&entityId=${doc.id}`
                            )
                          }
                        >
                          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                        <Button
                          variant="icon"
                          size="icon-sm"
                          title="Index to Vector Store"
                          aria-label="Index to Vector Store"
                          disabled={indexingDocId === doc.id}
                          onClick={async () => {
                            setIndexingDocId(doc.id);
                            try {
                              const res = await fetch('/api/vector/ingest', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ documentId: doc.id }),
                              });
                              const data = await res.json();
                              if (data.success) {
                                alert(`Document indexed! Created ${data.chunksCreated} chunks.`);
                              } else {
                                alert(`Indexing failed: ${data.error || 'Unknown error'}`);
                              }
                            } catch {
                              alert('Failed to index document');
                            } finally {
                              setIndexingDocId(null);
                            }
                          }}
                        >
                          {indexingDocId === doc.id ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-[var(--accent)] border-t-transparent" />
                          ) : (
                            <Database className="h-4 w-4" strokeWidth={1.75} />
                          )}
                        </Button>
                        {doc.sharepointWebUrl && (
                          <Button
                            asChild
                            variant="icon"
                            size="icon-sm"
                            title="Open in SharePoint"
                            aria-label="Open in SharePoint"
                          >
                            <a
                              href={doc.sharepointWebUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
                            </a>
                          </Button>
                        )}
                        <span className="mx-1 h-4 w-px bg-[var(--border)]" aria-hidden />
                        <Button
                          variant="icon"
                          size="icon-sm"
                          className="hover:text-[var(--status-error)]"
                          title="Delete"
                          aria-label="Delete"
                          onClick={() => setDeletingDocument(doc)}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={fetchDocuments}
      />

      {editingDocument && (
        <EditModal
          documentId={editingDocument.id}
          isOpen={!!editingDocument}
          onClose={() => setEditingDocument(null)}
          onSuccess={fetchDocuments}
        />
      )}

      {deletingDocument && (
        <DeleteModal
          documentId={deletingDocument.id}
          isOpen={!!deletingDocument}
          onClose={() => setDeletingDocument(null)}
          onSuccess={fetchDocuments}
        />
      )}
    </div>
  );
}
