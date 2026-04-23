// Contract Hub - Corporate Carbon Group Australia
// Shared API client for all CRUD operations
// Handles both mock data mode and production mode

const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ path: string; message: string }>;
  _mock?: boolean;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  limit: number;
  offset: number;
}

// Build a query string from a plain object, skipping undefined/null values.
function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) q.set(key, String(value));
  }
  return q.toString();
}

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        errors: data.errors,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================================
// Documents API
// ============================================================

export const documentsApi = {
  list: (params?: { type?: string; status?: string; search?: string; limit?: number; offset?: number }) => {
    const qs = buildQuery({ type: params?.type, status: params?.status, search: params?.search, limit: params?.limit, offset: params?.offset });
    return apiFetch<Document[]>(`/documents${qs ? `?${qs}` : ''}`) as Promise<PaginatedResponse<Document>>;
  },

  get: (id: string) => apiFetch<Document>(`/documents/${id}`),

  create: (data: CreateDocumentInput) =>
    apiFetch<Document>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateDocumentInput>) =>
    apiFetch<Document>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<Document>(`/documents/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Contracts API
// ============================================================

export const contractsApi = {
  list: (params?: { status?: string; type?: string; search?: string; limit?: number; offset?: number }) => {
    const qs = buildQuery({ status: params?.status, type: params?.type, search: params?.search, limit: params?.limit, offset: params?.offset });
    return apiFetch<Contract[]>(`/contracts${qs ? `?${qs}` : ''}`) as Promise<PaginatedResponse<Contract>>;
  },

  get: (id: string) => apiFetch<Contract>(`/contracts/${id}`),

  create: (data: CreateContractInput) =>
    apiFetch<Contract>('/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateContractInput>) =>
    apiFetch<Contract>(`/contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<Contract>(`/contracts/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Matters API
// ============================================================

export const mattersApi = {
  list: (params?: { status?: string; priority?: string; search?: string; limit?: number; offset?: number }) => {
    const qs = buildQuery({ status: params?.status, priority: params?.priority, search: params?.search, limit: params?.limit, offset: params?.offset });
    return apiFetch<Matter[]>(`/matters${qs ? `?${qs}` : ''}`) as Promise<PaginatedResponse<Matter>>;
  },

  get: (id: string) => apiFetch<Matter>(`/matters/${id}`),

  create: (data: CreateMatterInput) =>
    apiFetch<Matter>('/matters', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateMatterInput>) =>
    apiFetch<Matter>(`/matters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<Matter>(`/matters/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Vendors API
// ============================================================

export const vendorsApi = {
  list: (params?: { type?: string; active?: boolean; search?: string; limit?: number; offset?: number }) => {
    const qs = buildQuery({ type: params?.type, active: params?.active, search: params?.search, limit: params?.limit, offset: params?.offset });
    return apiFetch<Vendor[]>(`/vendors${qs ? `?${qs}` : ''}`) as Promise<PaginatedResponse<Vendor>>;
  },

  get: (id: string) => apiFetch<Vendor>(`/vendors/${id}`),

  create: (data: CreateVendorInput) =>
    apiFetch<Vendor>('/vendors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateVendorInput>) =>
    apiFetch<Vendor>(`/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<Vendor>(`/vendors/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Approvals API
// ============================================================

export const approvalsApi = {
  list: (params?: { status?: string; type?: string; limit?: number; offset?: number }) => {
    const qs = buildQuery({ status: params?.status, type: params?.type, limit: params?.limit, offset: params?.offset });
    return apiFetch<Approval[]>(`/approvals${qs ? `?${qs}` : ''}`) as Promise<PaginatedResponse<Approval>>;
  },

  get: (id: string) => apiFetch<Approval>(`/approvals/${id}`),

  create: (data: CreateApprovalInput) =>
    apiFetch<Approval>('/approvals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approve: (id: string, approvedBy: string, comments?: string) =>
    apiFetch<Approval>(`/approvals/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'approve', approvedBy, comments }),
    }),

  reject: (id: string, approvedBy: string, comments?: string) =>
    apiFetch<Approval>(`/approvals/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'reject', approvedBy, comments }),
    }),

  cancel: (id: string) =>
    apiFetch<Approval>(`/approvals/${id}`, { method: 'DELETE' }),
};

// ============================================================
// SharePoint API
// ============================================================
export const sharepointApi = {
  status: () => apiFetch<{ configured: boolean; siteId: string | null; libraryId: string | null }>('/sharepoint'),

  testConnection: (credentials: { clientId: string; clientSecret: string; tenantId: string; siteId?: string; libraryId?: string }) =>
    apiFetch<{ connected: boolean; siteName?: string; libraryName?: string; error?: string }>('/settings/test-connection', { method: 'POST', body: JSON.stringify({ provider: 'sharepoint', ...credentials }), }),

  listFiles: (params?: { libraryId?: string; folderPath?: string; top?: number }) =>
    apiFetch<{ files: SharePointFile[]; folders: SharePointFolder[] }>('/sharepoint', { method: 'POST', body: JSON.stringify({ action: 'list-files', ...params }), }),

  uploadFile: (params: { libraryId: string; fileName: string; content: string; contentType: string; metadata?: Record<string, string> }) =>
    apiFetch<SharePointUploadResult>('/sharepoint', { method: 'POST', body: JSON.stringify({ action: 'upload-file', ...params }), }),

  downloadFile: (libraryId: string, itemId: string) =>
    apiFetch<{ base64: string; mimeType: string; fileName: string }>('/sharepoint', { method: 'POST', body: JSON.stringify({ action: 'download-file', libraryId, itemId }), }),

  deleteFile: (libraryId: string, itemId: string) =>
    apiFetch<void>('/sharepoint', { method: 'POST', body: JSON.stringify({ action: 'delete-file', libraryId, itemId }), }),

  getMetadata: (libraryId: string, itemId: string) =>
    apiFetch<SharePointFile>('/sharepoint', { method: 'POST', body: JSON.stringify({ action: 'get-metadata', libraryId, itemId }), }),

  createSharingLink: (libraryId: string, itemId: string, type: 'view' | 'edit', scope: 'anonymous' | 'organization') =>
    apiFetch<{ link: string }>('/sharepoint', { method: 'POST', body: JSON.stringify({ action: 'create-sharing-link', libraryId, itemId, type, scope }), }),

  search: (query: string, top?: number) =>
    apiFetch<SharePointFile[]>('/sharepoint', { method: 'POST', body: JSON.stringify({ action: 'search', query, top }), }),

  listSites: () =>
    apiFetch<Array<{ id: string; name: string; webUrl: string }>>('/sharepoint', { method: 'POST', body: JSON.stringify({ action: 'list-sites' }), }),

  listLibraries: (siteId: string) =>
    apiFetch<Array<{ id: string; name: string; webUrl: string }>>('/sharepoint', { method: 'POST', body: JSON.stringify({ action: 'list-libraries', siteId }), }),
};

// ============================================================

export interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  mimeType: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  eTag: string;
}

export interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  childCount: number;
}

export interface SharePointUploadResult {
  itemId: string;
  webUrl: string;
  eTag: string;
}

export interface SharePointConnectionStatus {
  connected: boolean;
  siteName?: string;
  libraryName?: string;
  error?: string;
}

export interface IntegrationConnection {
  id: string;
  tenantId: string;
  integrationType: string;
  name: string;
  config: Record<string, unknown>;
  status: string;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Type Definitions
// ============================================================

export interface Document {
  id: string;
  title: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
  description: string | null;
  tags: string[] | null;
  sharepointSiteId: string | null;
  sharepointLibraryId: string | null;
  sharepointItemId: string | null;
  sharepointWebUrl: string | null;
  sharepointETag: string | null;
  status: string;
  uploadedBy: string | null;
  tenantId: string;
  // Vector indexing fields for RAG pipeline
  vectorIndexed: boolean;
  vectorIndexedAt: string | null;
  vectorIndexStatus: 'pending' | 'extracted' | 'extraction_failed' | 'indexing' | 'indexed' | 'failed' | null;
  vectorIndexError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  title: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
  description?: string;
  tags?: string[];
  sharepointSiteId?: string;
  sharepointLibraryId?: string;
  sharepointItemId?: string;
  sharepointWebUrl?: string;
  sharepointETag?: string;
  status?: string;
}

export interface Contract {
  id: string;
  title: string;
  contractType: string;
  status: string;
  counterpartyName: string;
  counterpartyEmail: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  valueCurrency: string;
  valueAmount: string | null;
  description: string | null;
  matterId: string | null;
  primaryDocumentId: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractInput {
  title: string;
  contractType: string;
  status?: string;
  counterpartyName: string;
  counterpartyEmail?: string;
  effectiveDate?: string;
  expirationDate?: string;
  valueCurrency?: string;
  valueAmount?: string;
  description?: string;
  matterId?: string;
  primaryDocumentId?: string;
  assignedTo?: string;
}

export interface Matter {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  matterType: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  dueDate: string | null;
  closedAt: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMatterInput {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  matterType?: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface Vendor {
  id: string;
  name: string;
  vendorType: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  billingAddress: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorInput {
  name: string;
  vendorType?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress?: string;
  website?: string;
  notes?: string;
  isActive?: boolean;
}

export interface Approval {
  id: string;
  approvableType: string;
  approvableId: string;
  requestedBy: string | null;
  approvedBy: string | null;
  status: string;
  comments: string | null;
  decidedAt: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalInput {
  approvableType: 'contract' | 'document' | 'invoice';
  approvableId: string;
  requestedBy: string;
  comments?: string;
}
