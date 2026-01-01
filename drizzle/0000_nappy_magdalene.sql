CREATE TYPE "public"."download_status" AS ENUM('not_started', 'in_progress', 'failed', 'completed');--> statement-breakpoint
CREATE TABLE "dryad_datasets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ext_id" integer NOT NULL,
	"dataset_doi" text NOT NULL,
	"original_file_size" bigint,
	"title" text NOT NULL,
	"abstract" text,
	"usage_notes" text,
	"primary_article_url" text,
	"journal_issn" text,
	"dryad_publication_date" text NOT NULL,
	"dryad_last_modified_date" text NOT NULL,
	"latest_version_id" integer NOT NULL,
	"download_status" "download_status" DEFAULT 'not_started' NOT NULL,
	"indexed_timestamp" timestamp NOT NULL,
	"updated_timestamp" timestamp NOT NULL,
	CONSTRAINT "dryad_datasets_ext_id_unique" UNIQUE("ext_id")
);
--> statement-breakpoint
CREATE TABLE "dryad_excel_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"dryad_dataset_id" integer NOT NULL,
	"ext_file_id" integer NOT NULL,
	"filename" text NOT NULL,
	"size" integer NOT NULL,
	"download_status" "download_status" DEFAULT 'not_started' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dryad_indexing_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"last_page_indexed" integer
);
--> statement-breakpoint
CREATE TABLE "dryad_readme_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"dryad_dataset_id" integer NOT NULL,
	"ext_file_id" integer NOT NULL,
	"filename" text NOT NULL,
	"size" integer NOT NULL,
	"download_status" "download_status" DEFAULT 'not_started' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dryad_excel_files" ADD CONSTRAINT "dryad_excel_files_dryad_dataset_id_dryad_datasets_id_fk" FOREIGN KEY ("dryad_dataset_id") REFERENCES "public"."dryad_datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dryad_readme_files" ADD CONSTRAINT "dryad_readme_files_dryad_dataset_id_dryad_datasets_id_fk" FOREIGN KEY ("dryad_dataset_id") REFERENCES "public"."dryad_datasets"("id") ON DELETE no action ON UPDATE no action;