-- Add local storage fallback columns so uploaded documents persist when
-- SharePoint isn't configured. Backed by a Railway persistent volume.

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "storage_provider" varchar(50) DEFAULT 'local' NOT NULL;

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "storage_key" text;

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "storage_checksum" varchar(128);

-- Backfill: any pre-existing documents with a sharepoint_item_id are SharePoint-backed
UPDATE "documents"
SET "storage_provider" = 'sharepoint'
WHERE "sharepoint_item_id" IS NOT NULL;
