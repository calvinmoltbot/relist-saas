CREATE TABLE "items" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"category" text,
	"condition" text,
	"size" text,
	"cost_price" numeric(10, 2),
	"listed_price" numeric(10, 2),
	"sold_price" numeric(10, 2),
	"status" text DEFAULT 'sourced' NOT NULL,
	"platform" text DEFAULT 'vinted',
	"photo_urls" text[],
	"thumbnail_url" text,
	"description" text,
	"source_type" text,
	"source_location" text,
	"vinted_url" text,
	"listed_at" timestamp with time zone,
	"sold_at" timestamp with time zone,
	"buyer_paid_shipping" boolean DEFAULT true,
	"shipped_at" timestamp with time zone,
	"relist_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"transaction_type" text NOT NULL,
	"gross_price" numeric(10, 2),
	"shipping_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"platform_fees" numeric(10, 2) DEFAULT '0' NOT NULL,
	"profit" numeric(10, 2),
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_user_status_idx" ON "items" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "items_user_brand_idx" ON "items" USING btree ("user_id","brand");--> statement-breakpoint
CREATE INDEX "items_user_category_idx" ON "items" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "items_user_created_idx" ON "items" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "items_user_listed_idx" ON "items" USING btree ("user_id","listed_at");--> statement-breakpoint
CREATE INDEX "items_user_sold_idx" ON "items" USING btree ("user_id","sold_at");--> statement-breakpoint
CREATE INDEX "transactions_user_item_idx" ON "transactions" USING btree ("user_id","item_id");--> statement-breakpoint
CREATE INDEX "transactions_user_completed_idx" ON "transactions" USING btree ("user_id","completed_at");