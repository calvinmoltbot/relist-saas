CREATE TYPE "public"."acquisition_type" AS ENUM('bought', 'own');--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "acquisition_type" "acquisition_type" DEFAULT 'bought' NOT NULL;--> statement-breakpoint
-- Backfill: items with no real cost are treated as 'own'. New rows continue to
-- default to 'bought'. See AGENTS.md → "Cost handling".
UPDATE "items" SET "acquisition_type" = 'own' WHERE "cost_price" IS NULL OR "cost_price" = 0;
