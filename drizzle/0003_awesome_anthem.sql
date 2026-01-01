CREATE TABLE "ai_review_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"dryad_dataset_id" integer NOT NULL,
	"dryad_excel_file_id" integer NOT NULL,
	"sheet_name" text NOT NULL,
	"prompt" text NOT NULL,
	"model" text NOT NULL,
	"explanation" text NOT NULL,
	"false_positive_theory" text NOT NULL,
	"suspicion_score" integer NOT NULL,
	"impact_score" integer NOT NULL,
	"hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_review_results" ADD CONSTRAINT "ai_review_results_dryad_dataset_id_dryad_datasets_id_fk" FOREIGN KEY ("dryad_dataset_id") REFERENCES "public"."dryad_datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_review_results" ADD CONSTRAINT "ai_review_results_dryad_excel_file_id_dryad_excel_files_id_fk" FOREIGN KEY ("dryad_excel_file_id") REFERENCES "public"."dryad_excel_files"("id") ON DELETE no action ON UPDATE no action;