ALTER TYPE "public"."integration_type" ADD VALUE 'anthropic';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "storage_provider" varchar(50) DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "storage_checksum" varchar(128);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "vector_indexed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "vector_indexed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "vector_index_status" varchar(50) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "vector_index_error" text;