DROP TABLE "pmc_data_files" CASCADE;--> statement-breakpoint
DROP TABLE "pmc_datasets" CASCADE;--> statement-breakpoint
ALTER TABLE "pmc_dataset_details" ADD COLUMN "xml_url" text;