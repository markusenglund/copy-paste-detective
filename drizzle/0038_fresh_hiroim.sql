ALTER TABLE "human_reviews" RENAME COLUMN "dryad_dataset_id" TO "dataset_id";--> statement-breakpoint
ALTER TABLE "human_reviews" DROP CONSTRAINT "uq_human_reviews_dataset_user";--> statement-breakpoint
ALTER TABLE "ai_column_categorization_results" DROP CONSTRAINT "ai_column_categorization_results_dryad_dataset_id_dryad_datasets_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_column_categorization_results" DROP CONSTRAINT "ai_column_categorization_results_dryad_excel_file_id_dryad_excel_files_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_meta_analysis_results" DROP CONSTRAINT "ai_meta_analysis_results_dryad_dataset_id_dryad_datasets_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_review_results" DROP CONSTRAINT "ai_review_results_dryad_dataset_id_dryad_datasets_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_review_results" DROP CONSTRAINT "ai_review_results_dryad_excel_file_id_dryad_excel_files_id_fk";
--> statement-breakpoint
ALTER TABLE "articles" DROP CONSTRAINT "articles_dryad_dataset_id_dryad_datasets_id_fk";
--> statement-breakpoint
ALTER TABLE "dataset_tags" DROP CONSTRAINT "dataset_tags_dataset_id_dryad_datasets_id_fk";
--> statement-breakpoint
ALTER TABLE "human_reviews" DROP CONSTRAINT "human_reviews_dryad_dataset_id_dryad_datasets_id_fk";
--> statement-breakpoint
DROP INDEX "ai_review_results_latest_per_sheet_idx";--> statement-breakpoint
DROP INDEX "idx_ai_review_results_latest_dataset";--> statement-breakpoint
DROP INDEX "idx_articles_dryad_dataset_id";--> statement-breakpoint
DROP INDEX "idx_human_reviews_dryad_dataset_id";--> statement-breakpoint
DROP INDEX "idx_human_reviews_latest_dataset";--> statement-breakpoint
ALTER TABLE "dataset_tags" ADD CONSTRAINT "dataset_tags_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_review_results_latest_per_sheet_unified_idx" ON "ai_review_results" USING btree ("dataset_file_id","sheet_name") WHERE "ai_review_results"."is_latest_review" = true;--> statement-breakpoint
CREATE INDEX "idx_ai_review_results_latest_dataset_unified" ON "ai_review_results" USING btree ("dataset_id") WHERE "ai_review_results"."is_latest_review" = true;--> statement-breakpoint
CREATE INDEX "idx_human_reviews_dataset_id" ON "human_reviews" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX "idx_human_reviews_latest_dataset_unified" ON "human_reviews" USING btree ("dataset_id") WHERE "human_reviews"."is_latest_review" = true;--> statement-breakpoint
ALTER TABLE "ai_column_categorization_results" DROP COLUMN "dryad_dataset_id";--> statement-breakpoint
ALTER TABLE "ai_column_categorization_results" DROP COLUMN "dryad_excel_file_id";--> statement-breakpoint
ALTER TABLE "ai_meta_analysis_results" DROP COLUMN "dryad_dataset_id";--> statement-breakpoint
ALTER TABLE "ai_review_results" DROP COLUMN "dryad_dataset_id";--> statement-breakpoint
ALTER TABLE "ai_review_results" DROP COLUMN "dryad_excel_file_id";--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN "dryad_dataset_id";--> statement-breakpoint
ALTER TABLE "human_reviews" ADD CONSTRAINT "uq_human_reviews_dataset_user" UNIQUE("dataset_id","user_id");