import { pgTable, uuid, varchar, text, timestamp, integer, decimal, boolean, jsonb, date, pgEnum } from 'drizzle-orm/pg-core';

// ============================================================
// ENUMS
// ============================================================

export const documentTypeEnum = pgEnum('document_type', [
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
]);

export const contractStatusEnum = pgEnum('contract_status', [
  'draft',
  'review',
  'negotiation',
  'pending_approval',
  'approved',
  'signed',
  'active',
  'expired',
  'terminated',
  'archived',
]);

export const matterStatusEnum = pgEnum('matter_status', [
  'open',
  'in_progress',
  'pending_review',
  'closed',
  'on_hold',
  'cancelled',
]);

export const matterPriorityEnum = pgEnum('matter_priority', [
  'low',
  'medium',
  'high',
  'critical',
]);

export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'received',
  'under_review',
  'approved',
  'paid',
  'disputed',
  'overdue',
]);

export const aiProviderEnum = pgEnum('ai_provider', [
  'opencode',
]);

export const integrationTypeEnum = pgEnum('integration_type', [
  'sharepoint',
  'outlook',
  'docusign',
  'docassemble',
  'clio',
  'anthropic',
]);

// ============================================================
// USERS & TENANTS
// ============================================================

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  role: varchar('role', { length: 50 }).default('user').notNull(), // 'admin', 'manager', 'user'
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// DOCUMENTS (SharePoint-backed)
// ============================================================

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  documentType: documentTypeEnum('document_type').notNull(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileSize: integer('file_size').notNull(),
  fileMimeType: varchar('file_mime_type', { length: 100 }).notNull(),
  // Storage provider metadata (local volume fallback when SharePoint not configured)
  storageProvider: varchar('storage_provider', { length: 50 }).default('local').notNull(),
  storageKey: text('storage_key'),
  storageChecksum: varchar('storage_checksum', { length: 128 }),
  // SharePoint metadata
  sharepointSiteId: varchar('sharepoint_site_id', { length: 255 }),
  sharepointLibraryId: varchar('sharepoint_library_id', { length: 255 }),
  sharepointItemId: varchar('sharepoint_item_id', { length: 255 }),
  sharepointWebUrl: text('sharepoint_web_url'),
  sharepointETag: varchar('sharepoint_e_tag', { length: 255 }),
  description: text('description'),
  tags: jsonb('tags'),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  // Vector indexing fields for RAG pipeline
  vectorIndexed: boolean('vector_indexed').default(false),
  vectorIndexedAt: timestamp('vector_indexed_at', { withTimezone: true }),
  vectorIndexStatus: varchar('vector_index_status', { length: 50 }).default('pending'),
  vectorIndexError: text('vector_index_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documentVersions = pgTable('document_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  versionNumber: integer('version_number').notNull(),
  sharepointItemId: varchar('sharepoint_item_id', { length: 255 }),
  changeSummary: text('change_summary'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// CONTRACTS
// ============================================================

export const contracts = pgTable('contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  contractType: varchar('contract_type', { length: 100 }).notNull(), // 'nda', 'msa', 'vendor', 'employment', 'lease', etc.
  status: contractStatusEnum('status').default('draft').notNull(),
  counterpartyName: varchar('counterparty_name', { length: 500 }).notNull(),
  counterpartyEmail: varchar('counterparty_email', { length: 255 }),
  effectiveDate: date('effective_date'),
  expirationDate: date('expiration_date'),
  valueCurrency: varchar('value_currency', { length: 3 }).default('AUD'),
  valueAmount: decimal('value_amount', { precision: 20, scale: 2 }),
  description: text('description'),
  matterId: uuid('matter_id').references(() => matters.id),
  primaryDocumentId: uuid('primary_document_id').references(() => documents.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// MATTERS
// ============================================================

export const matters = pgTable('matters', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: matterStatusEnum('status').default('open').notNull(),
  priority: matterPriorityEnum('priority').default('medium').notNull(),
  matterType: varchar('matter_type', { length: 100 }), // 'litigation', 'transactional', 'advisory', 'compliance', etc.
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// VENDORS (Outside Counsel)
// ============================================================

export const vendors = pgTable('vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  vendorType: varchar('vendor_type', { length: 100 }), // 'outside_counsel', 'legal_services', 'consulting'
  contactName: varchar('contact_name', { length: 500 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  billingAddress: text('billing_address'),
  website: varchar('website', { length: 500 }),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// INVOICES
// ============================================================

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  vendorId: uuid('vendor_id').references(() => vendors.id),
  matterId: uuid('matter_id').references(() => matters.id),
  contractId: uuid('contract_id').references(() => contracts.id),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  invoiceDate: date('invoice_date').notNull(),
  dueDate: date('due_date'),
  amountCurrency: varchar('amount_currency', { length: 3 }).default('AUD'),
  amount: decimal('amount', { precision: 20, scale: 2 }).notNull(),
  status: invoiceStatusEnum('status').default('received').notNull(),
  description: text('description'),
  documentId: uuid('document_id').references(() => documents.id),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// TASKS
// ============================================================

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  parentType: varchar('parent_type', { length: 50 }).notNull(), // 'matter', 'contract', 'invoice'
  parentId: uuid('parent_id').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('todo').notNull(), // 'todo', 'in_progress', 'review', 'done'
  priority: matterPriorityEnum('priority').default('medium').notNull(),
  assignedTo: uuid('assigned_to').references(() => users.id),
  dueDate: timestamp('due_date', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// APPROVALS
// ============================================================

export const approvals = pgTable('approvals', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  approvableType: varchar('approvable_type', { length: 50 }).notNull(), // 'contract', 'document', 'invoice'
  approvableId: uuid('approvable_id').notNull(),
  requestedBy: uuid('requested_by').references(() => users.id).notNull(),
  approvedBy: uuid('approved_by').references(() => users.id),
  status: approvalStatusEnum('status').default('pending').notNull(),
  comments: text('comments'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// COMMENTS
// ============================================================

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  commentableType: varchar('commentable_type', { length: 50 }).notNull(), // 'matter', 'contract', 'document', 'task'
  commentableId: uuid('commentable_id').notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// AI ANALYSIS RESULTS
// ============================================================

export const aiAnalyses = pgTable('ai_analyses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'contract', 'document'
  entityId: uuid('entity_id').notNull(),
  analysisType: varchar('analysis_type', { length: 50 }).notNull(), // 'contract_review', 'risk_assessment', 'compliance', 'extraction'
  provider: aiProviderEnum('provider').notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  result: jsonb('result').notNull(), // Structured JSON output from AI
  safetyScore: integer('safety_score'), // 0-100 for contract reviews
  status: varchar('status', { length: 50 }).default('pending').notNull(), // 'pending', 'completed', 'failed', 'approved', 'rejected'
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  promptVersion: varchar('prompt_version', { length: 50 }),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// AI MODEL SETTINGS (User-selectable)
// ============================================================

export const aiModelSettings = pgTable('ai_model_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  // Default model for general use
  defaultProvider: aiProviderEnum('default_provider').default('opencode').notNull(),
  defaultModel: varchar('default_model', { length: 100 }).default('claude-sonnet-4-5').notNull(),
  // Model for contract review (high quality)
  reviewProvider: aiProviderEnum('review_provider').default('opencode').notNull(),
  reviewModel: varchar('review_model', { length: 100 }).default('claude-sonnet-4-5').notNull(),
  // Model for document extraction (fast/cheap)
  extractionProvider: aiProviderEnum('extraction_provider').default('opencode').notNull(),
  extractionModel: varchar('extraction_model', { length: 100 }).default('claude-haiku-4-5').notNull(),
  // Model for legal analysis (reasoning)
  analysisProvider: aiProviderEnum('analysis_provider').default('opencode').notNull(),
  analysisModel: varchar('analysis_model', { length: 100 }).default('qwen3-max').notNull(),
  // Workflow settings
  requireHumanApproval: boolean('require_human_approval').default(true).notNull(),
  autoClassifyDocuments: boolean('auto_classify_documents').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// PROMPT TEMPLATES (Versioned)
// ============================================================

export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'contract_review', 'risk_assessment', 'compliance', 'extraction', 'legal_advice'
  version: integer('version').default(1).notNull(),
  systemPrompt: text('system_prompt').notNull(),
  userPromptTemplate: text('user_prompt_template').notNull(),
  outputSchema: jsonb('output_schema'), // JSON Schema for structured output validation
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// INTEGRATION CONNECTIONS
// ============================================================

export const integrationConnections = pgTable('integration_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  integrationType: integrationTypeEnum('integration_type').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  config: jsonb('config').notNull(), // Encrypted connection details
  status: varchar('status', { length: 50 }).default('active').notNull(), // 'active', 'inactive', 'error'
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// AUDIT EVENTS (Immutable)
// ============================================================

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(), // 'document_created', 'contract_signed', 'approval_granted', etc.
  actorId: uuid('actor_id').references(() => users.id),
  actorType: varchar('actor_type', { length: 50 }).default('user').notNull(), // 'user', 'system', 'agent'
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// LINKS (Flexible Associations)
// ============================================================

export const links = pgTable('links', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  sourceType: varchar('source_type', { length: 50 }).notNull(), // 'matter', 'contract', 'document', 'vendor', 'invoice'
  sourceId: uuid('source_id').notNull(),
  targetType: varchar('target_type', { length: 50 }).notNull(),
  targetId: uuid('target_id').notNull(),
  relationship: varchar('relationship', { length: 50 }), // 'related_to', 'amendment_of', 'supersedes'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});