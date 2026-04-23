// Contract Hub - Unified Document Storage
//
// Primary backend: SharePoint (when Azure AD + library are configured).
// Fallback backend: local filesystem, backed by a Railway persistent volume
// (mounted at STORAGE_DIR, default `/data/documents`). This ensures uploaded
// files still persist across deploys and restarts when SharePoint isn't ready.

import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type StorageProvider = 'sharepoint' | 'local';

export interface StoredFile {
  provider: StorageProvider;
  /** Opaque identifier used to retrieve the file (path for local, itemId for SharePoint). */
  storageKey: string;
  checksum: string; // sha256 hex
  sharepoint?: {
    siteId?: string;
    libraryId: string;
    itemId: string;
    webUrl: string;
    eTag: string;
  };
}

export interface DownloadedFile {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

function isSharePointConfigured(): boolean {
  return Boolean(
    process.env.AZURE_AD_CLIENT_ID &&
      process.env.AZURE_AD_CLIENT_SECRET &&
      process.env.AZURE_AD_TENANT_ID &&
      process.env.SHAREPOINT_LIBRARY_ID,
  );
}

export function getStorageDir(): string {
  // Default path aligns with a Railway volume mount point of /data
  return process.env.STORAGE_DIR || '/data/documents';
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function sanitizeFileName(name: string): string {
  // Strip path separators and control characters; keep extension.
  return name.replace(/[\\/\x00-\x1f]/g, '_').slice(0, 200) || 'file';
}

function buildLocalKey(tenantId: string, fileName: string): string {
  const safeTenant = tenantId.replace(/[^a-zA-Z0-9-]/g, '');
  const safeName = sanitizeFileName(fileName);
  return path.posix.join(safeTenant, `${randomUUID()}_${safeName}`);
}

function resolveLocalPath(storageKey: string): string {
  const base = path.resolve(getStorageDir());
  const full = path.resolve(base, storageKey);
  if (!full.startsWith(base + path.sep) && full !== base) {
    throw new Error('Invalid storage key (path traversal blocked)');
  }
  return full;
}

// Maximum file size: 50MB (to prevent resource exhaustion)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function putFile(params: {
  tenantId: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
  metadata?: Record<string, string>;
}): Promise<StoredFile> {
  // Validate file size
  if (params.buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  const checksum = createHash('sha256').update(params.buffer).digest('hex');

  if (isSharePointConfigured()) {
    try {
      const { getSharePointService } = await import('./sharepoint');
      const sp = getSharePointService();
      const libraryId = process.env.SHAREPOINT_LIBRARY_ID as string;
      const result = await sp.uploadFile({
        libraryId,
        fileName: sanitizeFileName(params.fileName),
        content: params.buffer,
        contentType: params.contentType,
        metadata: params.metadata,
      });
      return {
        provider: 'sharepoint',
        storageKey: result.itemId,
        checksum,
        sharepoint: {
          siteId: process.env.SHAREPOINT_SITE_ID,
          libraryId,
          itemId: result.itemId,
          webUrl: result.webUrl,
          eTag: result.eTag,
        },
      };
    } catch (err) {
      // If SharePoint upload fails, fall through to local persistence so
      // the user's document is never silently lost.
      console.error('SharePoint upload failed, falling back to local storage:', err);
    }
  }

  const storageKey = buildLocalKey(params.tenantId, params.fileName);
  const fullPath = resolveLocalPath(storageKey);
  await ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, params.buffer);
  return { provider: 'local', storageKey, checksum };
}

export async function getFile(params: {
  provider: StorageProvider;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sharepointLibraryId?: string | null;
}): Promise<DownloadedFile> {
  if (params.provider === 'sharepoint') {
    const { getSharePointService } = await import('./sharepoint');
    const sp = getSharePointService();
    const libraryId = params.sharepointLibraryId || process.env.SHAREPOINT_LIBRARY_ID;
    if (!libraryId) throw new Error('SharePoint library ID missing for download');
    return sp.downloadFile({ libraryId, itemId: params.storageKey });
  }

  const fullPath = resolveLocalPath(params.storageKey);
  const buffer = await fs.readFile(fullPath);
  return { buffer, mimeType: params.mimeType, fileName: params.fileName };
}

export async function deleteFile(params: {
  provider: StorageProvider;
  storageKey: string;
  sharepointLibraryId?: string | null;
}): Promise<void> {
  if (params.provider === 'sharepoint') {
    const { getSharePointService } = await import('./sharepoint');
    const sp = getSharePointService();
    const libraryId = params.sharepointLibraryId || process.env.SHAREPOINT_LIBRARY_ID;
    if (!libraryId) return;
    await sp.deleteFile({ libraryId, itemId: params.storageKey });
    return;
  }

  const fullPath = resolveLocalPath(params.storageKey);
  await fs.rm(fullPath, { force: true });
}

export function getStorageStatus(): {
  primary: StorageProvider;
  sharepointConfigured: boolean;
  localDir: string;
} {
  return {
    primary: isSharePointConfigured() ? 'sharepoint' : 'local',
    sharepointConfigured: isSharePointConfigured(),
    localDir: getStorageDir(),
  };
}

/**
 * Get document content as plain text for RAG vector store ingestion
 * Supports: txt, md, csv, json, and tries to extract from PDF/DOCX
 * 
 * For PDF/DOCX extraction in production, consider using:
 * - pdf-parse for PDFs
 * - mammoth for DOCX
 */
export async function getDocumentContent(document: {
  fileName: string;
  fileMimeType: string;
  storageProvider: string;
  storageKey: string | null;
  sharepointLibraryId?: string | null;
}): Promise<string | null> {
  try {
    const file = await getFile({
      provider: document.storageProvider as StorageProvider,
      storageKey: document.storageKey || '',
      fileName: document.fileName,
      mimeType: document.fileMimeType,
      sharepointLibraryId: document.sharepointLibraryId,
    });

    const buffer = file.buffer;
    const mimeType = document.fileMimeType.toLowerCase();

    // Handle text-based file types
    if (
      mimeType === 'text/plain' ||
      mimeType === 'text/markdown' ||
      mimeType === 'application/json' ||
      mimeType === 'text/csv' ||
      mimeType === 'text/html'
    ) {
      return buffer.toString('utf-8');
    }

    // Try PDF text extraction (basic - works for text-based PDFs)
    if (mimeType === 'application/pdf') {
      try {
        // Basic PDF text extraction using Buffer methods
        // This works for text-based PDFs but not scanned/image PDFs
        const text = buffer.toString('latin1');
        // Extract readable text between stream/endstream markers
        const matches = text.match(/stream[\s\S]*?endstream/g) || [];
        let extractedText = '';
        for (const match of matches) {
          const content = match.replace(/^stream/, '').replace(/endstream$/, '');
          // Filter to printable ASCII
          const printable = content.replace(/[^\x20-\x7E\n\r]/g, ' ');
          if (printable.trim().length > 10) {
            extractedText += printable + '\n';
          }
        }
        if (extractedText.trim().length > 50) {
          return extractedText.trim();
        }
        console.warn('PDF appears to be scanned/image-based:', document.fileName);
        return null;
      } catch {
        console.warn('Failed to extract text from PDF:', document.fileName);
        return null;
      }
    }

    // Try DOCX extraction (basic - DOCX is a ZIP file with XML)
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        // Basic DOCX text extraction
        const { default: AdmZip } = await import('adm-zip');
        const zip = new AdmZip(buffer);
        const documentXml = zip.readAsText('word/document.xml');
        if (documentXml) {
          // Simple XML text extraction (strip tags and normalize whitespace)
          return documentXml
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      } catch {
        console.warn('Failed to extract text from DOCX:', document.fileName);
      }
      return null;
    }

    // Unknown type - try as text anyway
    const text = buffer.toString('utf-8');
    // Check for binary content
    const hasBinary = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text.slice(0, 100));
    if (hasBinary) {
      console.warn('File appears to be binary:', document.fileName, mimeType);
      return null;
    }
    return text;
  } catch (error) {
    console.error('Failed to get document content:', error);
    return null;
  }
}
