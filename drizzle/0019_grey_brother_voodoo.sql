ALTER TABLE "ai_review_results" ADD COLUMN "is_latest_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_review_results_latest_per_sheet_idx" ON "ai_review_results" USING btree ("dryad_excel_file_id","sheet_name") WHERE "ai_review_results"."is_latest_review" = true;--> statement-breakpoint
CREATE INDEX "ai_review_results_is_latest_idx" ON "ai_review_results" USING btree ("is_latest_review") WHERE "ai_review_results"."is_latest_review" = true;--> statement-breakpoint
CREATE INDEX "idx_articles_publication_date" ON "articles" USING btree ("publication_date");--> statement-breakpoint
CREATE INDEX "idx_articles_num_citations" ON "articles" USING btree ("num_citations");--> statement-breakpoint
CREATE INDEX "idx_articles_citation_percentile" ON "articles" USING btree ("citation_normalized_percentile");--> statement-breakpoint

-- Populate is_latest_review for existing data
-- For each unique (dryad_dataset_id, dryad_excel_file_id, sheet_name),
-- set is_latest_review = true for the review with MAX(created_at)

UPDATE "ai_review_results" AS arr
SET "is_latest_review" = true
FROM (
  SELECT
    "dryad_dataset_id",
    "dryad_excel_file_id",
    "sheet_name",
    MAX("created_at") as max_created_at
  FROM "ai_review_results"
  GROUP BY "dryad_dataset_id", "dryad_excel_file_id", "sheet_name"
) AS latest
WHERE arr."dryad_dataset_id" = latest."dryad_dataset_id"
  AND arr."dryad_excel_file_id" = latest."dryad_excel_file_id"
  AND arr."sheet_name" = latest."sheet_name"
  AND arr."created_at" = latest.max_created_at;