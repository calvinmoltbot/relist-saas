CREATE TABLE "expenses" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"item_id" text,
	"incurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "expenses_user_incurred_idx" ON "expenses" USING btree ("user_id","incurred_at");--> statement-breakpoint
CREATE INDEX "expenses_user_category_idx" ON "expenses" USING btree ("user_id","category");