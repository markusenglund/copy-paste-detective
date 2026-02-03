CREATE TYPE "public"."verdict" AS ENUM('true_positive', 'false_positive', 'ambiguous');--> statement-breakpoint
CREATE TABLE "human_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"dryad_dataset_id" integer NOT NULL,
	"verdict" "verdict" NOT NULL,
	"impact_score" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "ai_review_results_latest_per_sheet_idx";--> statement-breakpoint
ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_dryad_dataset_id_dryad_datasets_id_fk" FOREIGN KEY ("dryad_dataset_id") REFERENCES "public"."dryad_datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_human_reviews_dryad_dataset_id" ON "human_reviews" USING btree ("dryad_dataset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_review_results_latest_per_sheet_idx" ON "ai_review_results" USING btree ("dryad_excel_file_id","sheet_name") WHERE "ai_review_results"."is_latest_review" = true;