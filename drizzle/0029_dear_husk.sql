DO $$ BEGIN
  CREATE TYPE "public"."data_file_type" AS ENUM('excel');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pmc_data_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"pmc_dataset_id" integer NOT NULL,
	"filename" text NOT NULL,
	"file_type" "data_file_type" NOT NULL,
	"s3_url" text NOT NULL,
	"size" bigint,
	"download_status" "download_status" DEFAULT 'not_started' NOT NULL,
	CONSTRAINT "pmc_data_files_s3_url_unique" UNIQUE("s3_url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pmc_datasets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ext_pmc_id" text NOT NULL,
	"pmc_version" integer NOT NULL,
	"ext_pmid" text,
	"doi" text,
	"title" text NOT NULL,
	"abstract" text,
	"author_string" text,
	"journal_issn" text,
	"pmc_publication_date" text NOT NULL,
	"num_citations" integer,
	"license" text,
	"is_retracted" boolean,
	"full_pdf_url" text,
	"download_status" "download_status" DEFAULT 'not_started' NOT NULL,
	"analysis_status" "analysis_status" DEFAULT 'not_analyzed' NOT NULL,
	"is_meta_analysis" boolean,
	"indexed_timestamp" timestamp DEFAULT now() NOT NULL,
	"updated_timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pmc_datasets_ext_pmc_id_unique" UNIQUE("ext_pmc_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pmc_indexing_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"last_cursor_mark" text,
	"total_indexed" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pmc_data_files" DROP CONSTRAINT IF EXISTS "pmc_data_files_pmc_dataset_id_pmc_datasets_id_fk";--> statement-breakpoint
ALTER TABLE "pmc_data_files" ADD CONSTRAINT "pmc_data_files_pmc_dataset_id_pmc_datasets_id_fk" FOREIGN KEY ("pmc_dataset_id") REFERENCES "public"."pmc_datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pmc_data_files_pmc_dataset_id_idx" ON "pmc_data_files" USING btree ("pmc_dataset_id");
