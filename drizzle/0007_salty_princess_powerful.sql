CREATE INDEX "items_user_status_sold_idx" ON "items" USING btree ("user_id","status","sold_at");--> statement-breakpoint
CREATE INDEX "items_user_acquisition_idx" ON "items" USING btree ("user_id","acquisition_type");--> statement-breakpoint
CREATE INDEX "items_user_source_idx" ON "items" USING btree ("user_id","source_type");