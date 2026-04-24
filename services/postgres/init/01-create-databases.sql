CREATE DATABASE contracthub;
-- Note: tables are created by the contract-hub app via Drizzle migrations at startup
-- (drizzle-kit migrate / next build && drizzle-kit push), not here.
-- Kept here only for reference and any raw-schema use cases.
--
-- CREATE USER contracthub WITH PASSWORD 'contracthub';
-- GRANT ALL PRIVILEGES ON DATABASE contracthub TO contracthub;
-- CREATE EXTENSION IF NOT EXISTS vector;  -- Requires pgvector installation

\c contracthub;

-- Run full contract-hub schema (safe to run idempotently via CREATE OR REPLACE / IF NOT EXISTS)
-- This is a fallback: normally the app manages its own migrations.
BEGIN;

-- tenents table (required by almost all FKs)
CREATE TABLE IF NOT EXISTS tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    name varchar(500) NOT NULL,
    slug varchar(100) NOT NULL,
    settings jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenants_slug_unique UNIQUE(slug)
);

-- users table
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    email varchar(255) NOT NULL,
    name varchar(500) NOT NULL,
    role varchar(50) DEFAULT 'user' NOT NULL,
    avatar_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE no action ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS matters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    title varchar(500) NOT NULL,
    description text,
    status varchar(50) DEFAULT 'open' NOT NULL,
    priority varchar(20) DEFAULT 'medium' NOT NULL,
    matter_type varchar(100),
    assigned_to uuid,
    created_by uuid NOT NULL,
    due_date timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT matters_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE no action ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS vendors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name varchar(500) NOT NULL,
    vendor_type varchar(100),
    contact_name varchar(500),
    contact_email varchar(255),
    contact_phone varchar(50),
    billing_address text,
    website varchar(500),
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendors_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE no action ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    title varchar(500) NOT NULL,
    document_type varchar(50) NOT NULL,
    file_name varchar(500) NOT NULL,
    file_size integer NOT NULL,
    file_mime_type varchar(100) NOT NULL,
    sharepoint_site_id varchar(255),
    sharepoint_library_id varchar(255),
    sharepoint_item_id varchar(255),
    sharepoint_web_url text,
    sharepoint_e_tag varchar(255),
    description text,
    tags jsonb,
    uploaded_by uuid,
    status varchar(50) DEFAULT 'active' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT documents_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE no action ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    title varchar(500) NOT NULL,
    contract_type varchar(100) NOT NULL,
    status varchar(50) DEFAULT 'draft' NOT NULL,
    counterparty_name varchar(500) NOT NULL,
    counterparty_email varchar(255),
    effective_date date,
    expiration_date date,
    value_currency varchar(3) DEFAULT 'AUD',
    value_amount numeric(20, 2),
    description text,
    matter_id uuid,
    primary_document_id uuid,
    assigned_to uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contracts_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE no action ON UPDATE no action,
    CONSTRAINT contracts_matter_id_matters_id_fk FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE no action ON UPDATE no action
);

COMMIT;

-- Create a default tenant so the app can boot without Clerk provisioning first
INSERT INTO tenants (id, name, slug, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Tenant',
    'default',
    '{"clerk_managed": true}'
)
ON CONFLICT (slug) DO NOTHING;
