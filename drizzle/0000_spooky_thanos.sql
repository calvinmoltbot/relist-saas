CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "api_keys_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "price_data" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"external_id" text,
	"title" text NOT NULL,
	"brand" text,
	"category" text,
	"size" text,
	"condition" text,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"url" text,
	"raw_payload" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_stats" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"bucket_key" text NOT NULL,
	"sample_size" integer NOT NULL,
	"median_minor" integer NOT NULL,
	"p25_minor" integer NOT NULL,
	"p75_minor" integer NOT NULL,
	"mean_minor" double precision NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "price_data_user_observed_idx" ON "price_data" USING btree ("user_id","observed_at");--> statement-breakpoint
CREATE INDEX "price_data_user_brand_idx" ON "price_data" USING btree ("user_id","brand");--> statement-breakpoint
CREATE UNIQUE INDEX "price_data_user_source_external_idx" ON "price_data" USING btree ("user_id","source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "price_stats_user_bucket_idx" ON "price_stats" USING btree ("user_id","bucket_key");