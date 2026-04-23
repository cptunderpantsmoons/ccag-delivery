// app/agents/data-room/page.tsx
'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, FileText, Trash2, Download } from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';
import { uploadFile } from '@/lib/agent-api';
import { AppShell } from '../../components/shell/app-shell';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export default function DataRoomPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { setCanvasContent, setActiveTaskId } = useAgentStore();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    await handleFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await handleFiles(e.target.files);
    }
  }, []);

  async function handleFiles(fileList: FileList) {
    setUploading(true);
    const newFiles: FileItem[] = [];

    for (const file of Array.from(fileList)) {
      try {
        const result = await uploadFile(file);
        newFiles.push({
          id: result.fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
    setUploading(false);
  }

  function handleDelete(fileId: string) {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(type: string) {
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
      return <FileSpreadsheet size={20} className="text-emerald-500" />;
    }
    return <FileText size={20} className="text-blue-500" />;
  }

  return (
    <AppShell title="Data Room">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="editorial-heading text-3xl font-semibold text-[var(--text-primary)]">
            Data Room
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Upload and manage Excel, CSV, and JSON files for agent tasks.
          </p>
        </div>

        {/* Upload Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`mb-8 rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-[var(--border)] bg-[var(--surface)]'
          }`}
        >
          <Upload size={40} className="mx-auto mb-4 text-[var(--text-tertiary)]" />
          <p className="text-lg font-medium text-[var(--text-primary)]">
            Drag and drop files here
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            or click to browse (xlsx, xls, csv, json)
          </p>
          <input
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.json"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="mt-4 inline-block cursor-pointer rounded-lg bg-[var(--deep)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:opacity-90"
          >
            Browse Files
          </label>
          {uploading && (
            <p className="mt-2 text-sm text-blue-500">Uploading...</p>
          )}
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="font-medium text-[var(--text-primary)]">
                Uploaded Files ({files.length})
              </h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[var(--background)]"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.type)}
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {file.name}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {formatSize(file.size)} · {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        // Set as active file in canvas
                        setCanvasContent({
                          mode: 'excel',
                          // Would load actual Excel data here
                        });
                        setActiveTaskId(`preview_${file.id}`);
                      }}
                      className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--background)]"
                      title="Preview"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length === 0 && !uploading && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
            <p className="text-[var(--text-tertiary)]">No files uploaded yet.</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Upload Excel files to start building apps with agents.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
