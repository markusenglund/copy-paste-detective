UPDATE "pmc_dataset_details"
SET "full_text" = COALESCE("full_text", "full_text_2");
--> statement-breakpoint
ALTER TABLE "pmc_dataset_details" DROP COLUMN "full_text_2";