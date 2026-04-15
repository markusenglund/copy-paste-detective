UPDATE "dataset_files" SET "is_main_article" = true WHERE "file_type" = 'pdf' AND "is_main_article" IS NULL;--> statement-breakpoint
UPDATE "dataset_files" SET "is_main_article" = false WHERE "file_type" != 'pdf' AND "is_main_article" IS NULL;--> statement-breakpoint
ALTER TABLE "dataset_files" ALTER COLUMN "is_main_article" SET NOT NULL;