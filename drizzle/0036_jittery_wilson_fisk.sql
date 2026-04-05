ALTER TABLE "ai_column_categorization_results" DROP CONSTRAINT "ai_column_categorization_results_dataset_id_datasets_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_column_categorization_results" DROP CONSTRAINT "ai_column_categorization_results_dataset_file_id_dataset_files_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_meta_analysis_results" DROP CONSTRAINT "ai_meta_analysis_results_dataset_id_datasets_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_review_results" DROP CONSTRAINT "ai_review_results_dataset_id_datasets_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_review_results" DROP CONSTRAINT "ai_review_results_dataset_file_id_dataset_files_id_fk";
--> statement-breakpoint
ALTER TABLE "dataset_files" DROP CONSTRAINT "dataset_files_dataset_id_datasets_id_fk";
--> statement-breakpoint
ALTER TABLE "dryad_dataset_details" DROP CONSTRAINT "dryad_dataset_details_dataset_id_datasets_id_fk";
--> statement-breakpoint
ALTER TABLE "dryad_dataset_file_details" DROP CONSTRAINT "dryad_dataset_file_details_dataset_file_id_dataset_files_id_fk";
--> statement-breakpoint
ALTER TABLE "dryad_excel_files" DROP CONSTRAINT "dryad_excel_files_dryad_dataset_id_dryad_datasets_id_fk";
--> statement-breakpoint
ALTER TABLE "pmc_data_files" DROP CONSTRAINT "pmc_data_files_pmc_dataset_id_pmc_datasets_id_fk";
--> statement-breakpoint
ALTER TABLE "pmc_dataset_details" DROP CONSTRAINT "pmc_dataset_details_dataset_id_datasets_id_fk";
--> statement-breakpoint
ALTER TABLE "pmc_dataset_file_details" DROP CONSTRAINT "pmc_dataset_file_details_dataset_file_id_dataset_files_id_fk";
--> statement-breakpoint
ALTER TABLE "dataset_files" ADD COLUMN "source" "dataset_source";--> statement-breakpoint
UPDATE "dataset_files" SET "source" = (SELECT "source" FROM "datasets" WHERE "datasets"."id" = "dataset_files"."dataset_id");--> statement-breakpoint
ALTER TABLE "dataset_files" ALTER COLUMN "source" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_column_categorization_results" ADD CONSTRAINT "ai_column_categorization_results_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_column_categorization_results" ADD CONSTRAINT "ai_column_categorization_results_dataset_file_id_dataset_files_id_fk" FOREIGN KEY ("dataset_file_id") REFERENCES "public"."dataset_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_meta_analysis_results" ADD CONSTRAINT "ai_meta_analysis_results_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_review_results" ADD CONSTRAINT "ai_review_results_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_review_results" ADD CONSTRAINT "ai_review_results_dataset_file_id_dataset_files_id_fk" FOREIGN KEY ("dataset_file_id") REFERENCES "public"."dataset_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset_files" ADD CONSTRAINT "dataset_files_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dryad_dataset_details" ADD CONSTRAINT "dryad_dataset_details_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dryad_dataset_file_details" ADD CONSTRAINT "dryad_dataset_file_details_dataset_file_id_dataset_files_id_fk" FOREIGN KEY ("dataset_file_id") REFERENCES "public"."dataset_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dryad_excel_files" ADD CONSTRAINT "dryad_excel_files_dryad_dataset_id_dryad_datasets_id_fk" FOREIGN KEY ("dryad_dataset_id") REFERENCES "public"."dryad_datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pmc_data_files" ADD CONSTRAINT "pmc_data_files_pmc_dataset_id_pmc_datasets_id_fk" FOREIGN KEY ("pmc_dataset_id") REFERENCES "public"."pmc_datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pmc_dataset_details" ADD CONSTRAINT "pmc_dataset_details_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pmc_dataset_file_details" ADD CONSTRAINT "pmc_dataset_file_details_dataset_file_id_dataset_files_id_fk" FOREIGN KEY ("dataset_file_id") REFERENCES "public"."dataset_files"("id") ON DELETE cascade ON UPDATE no action;