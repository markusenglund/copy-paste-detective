CREATE INDEX "idx_ai_review_results_latest_dataset" ON "ai_review_results" USING btree ("dryad_dataset_id") WHERE "ai_review_results"."is_latest_review" = true;--> statement-breakpoint
CREATE INDEX "idx_article_authors_article_position" ON "article_authors" USING btree ("article_id","author_position");--> statement-breakpoint
CREATE INDEX "idx_articles_dryad_dataset_id" ON "articles" USING btree ("dryad_dataset_id");--> statement-breakpoint
CREATE INDEX "idx_articles_journal_id" ON "articles" USING btree ("journal_id");--> statement-breakpoint
CREATE INDEX "idx_articles_field" ON "articles" USING btree ("field");--> statement-breakpoint
CREATE INDEX "idx_human_reviews_latest_dataset" ON "human_reviews" USING btree ("dryad_dataset_id") WHERE "human_reviews"."is_latest_review" = true;