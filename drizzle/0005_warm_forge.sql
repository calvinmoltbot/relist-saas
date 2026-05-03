ALTER TABLE "expenses" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "expenses_user_sample_idx" ON "expenses" USING btree ("user_id","is_sample");--> statement-breakpoint
CREATE INDEX "items_user_sample_idx" ON "items" USING btree ("user_id","is_sample");--> statement-breakpoint
CREATE INDEX "transactions_user_sample_idx" ON "transactions" USING btree ("user_id","is_sample");