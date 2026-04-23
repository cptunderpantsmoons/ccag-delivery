-- Add Anthropic as a supported integration type so OAuth tokens can be stored
-- in the existing integration_connections table.
--
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS requires PostgreSQL 9.3+.
-- Running inside a transaction is supported from PostgreSQL 12+.
-- Railway's managed Postgres is 14+, so this is safe.

ALTER TYPE "integration_type" ADD VALUE IF NOT EXISTS 'anthropic';
