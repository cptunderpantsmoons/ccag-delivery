# lib/db - Database Layer

## OVERVIEW
Drizzle ORM with PostgreSQL. Schema definitions, migrations, connection pooling.

## WHERE TO LOOK
| File | Purpose |
|------|---------|
| `schema/index.ts` | 20 tables: tenants, users, contracts, matters, documents, vendors, invoices, tasks, approvals, comments, ai_analyses, ai_model_settings, prompt_templates, integration_connections, audit_events, links |
| `index.ts` | Pool config (max 10, 5s timeout), graceful shutdown |
| `migrations/` | Drizzle migration files |
| `init.sql` | Initial schema bootstrap |

## CONVENTIONS
- UUID primary keys (`uuid().defaultRandom()`)
- Timestamps with timezone: `timestamp('created_at', { withTimezone: true })`
- Tenant isolation via `tenantId` FK on every table
- Enums for status fields (contract_status, matter_status, approval_status, etc.)
- JSONB for flexible config/metadata fields

## ANTI-PATTERNS
- Don't use raw SQL - Drizzle query builder only
- Don't bypass tenant filtering in queries
- `@ts-expect-error` in matters/route.ts:92 suppresses type mismatch (fix needed)
