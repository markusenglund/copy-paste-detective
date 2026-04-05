CREATE TYPE "public"."dataset_source" AS ENUM('dryad', 'pmc');--> statement-breakpoint
CREATE TABLE "dataset_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"dataset_id" integer NOT NULL,
	"filename" text NOT NULL,
	"file_type" text NOT NULL,
	"size" bigint NOT NULL,
	"download_status" "download_status" DEFAULT 'not_started' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datasets" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" "dataset_source" NOT NULL,
	"ext_id" text NOT NULL,
	"doi" text,
	"title" text NOT NULL,
	"abstract" text,
	"journal_issn" text,
	"publication_date" text NOT NULL,
	"download_status" "download_status" DEFAULT 'not_started' NOT NULL,
	"analysis_status" "analysis_status" DEFAULT 'not_analyzed' NOT NULL,
	"is_meta_analysis" boolean,
	"article_id" integer,
	"indexed_timestamp" timestamp DEFAULT now() NOT NULL,
	"updated_timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_datasets_source_ext_id" UNIQUE("source","ext_id")
);
--> statement-breakpoint
CREATE TABLE "dryad_dataset_details" (
	"dataset_id" integer NOT NULL,
	"ext_id_numeric" integer NOT NULL,
	"dataset_doi" text NOT NULL,
	"usage_notes" text,
	"primary_article_url" text,
	"dryad_last_modified_date" text NOT NULL,
	"latest_version_id" integer NOT NULL,
	"original_file_size" bigint,
	CONSTRAINT "dryad_dataset_details_dataset_id_unique" UNIQUE("dataset_id"),
	CONSTRAINT "dryad_dataset_details_ext_id_numeric_unique" UNIQUE("ext_id_numeric")
);
--> statement-breakpoint
CREATE TABLE "dryad_dataset_file_details" (
	"dataset_file_id" integer NOT NULL,
	"ext_file_id" integer NOT NULL,
	CONSTRAINT "dryad_dataset_file_details_dataset_file_id_unique" UNIQUE("dataset_file_id"),
	CONSTRAINT "dryad_dataset_file_details_ext_file_id_unique" UNIQUE("ext_file_id")
);
--> statement-breakpoint
CREATE TABLE "pmc_dataset_details" (
	"dataset_id" integer NOT NULL,
	"pmc_version" integer NOT NULL,
	"ext_pmid" text,
	"author_string" text,
	"num_citations" integer,
	"license" text,
	"is_retracted" boolean,
	"full_pdf_url" text,
	"supplemental_file_urls" text[],
	CONSTRAINT "pmc_dataset_details_dataset_id_unique" UNIQUE("dataset_id")
);
--> statement-breakpoint
CREATE TABLE "pmc_dataset_file_details" (
	"dataset_file_id" integer NOT NULL,
	"s3_url" text NOT NULL,
	CONSTRAINT "pmc_dataset_file_details_dataset_file_id_unique" UNIQUE("dataset_file_id"),
	CONSTRAINT "pmc_dataset_file_details_s3_url_unique" UNIQUE("s3_url")
);
--> statement-breakpoint
ALTER TABLE "ai_column_categorization_results" ALTER COLUMN "dryad_dataset_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_column_categorization_results" ALTER COLUMN "dryad_excel_file_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_meta_analysis_results" ALTER COLUMN "dryad_dataset_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_review_results" ALTER COLUMN "dryad_dataset_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_review_results" ALTER COLUMN "dryad_excel_file_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_column_categorization_results" ADD COLUMN "dataset_id" integer;--> statement-breakpoint
ALTER TABLE "ai_column_categorization_results" ADD COLUMN "dataset_file_id" integer;--> statement-breakpoint
ALTER TABLE "ai_meta_analysis_results" ADD COLUMN "dataset_id" integer;--> statement-breakpoint
ALTER TABLE "ai_review_results" ADD COLUMN "dataset_id" integer;--> statement-breakpoint
ALTER TABLE "ai_review_results" ADD COLUMN "dataset_file_id" integer;--> statement-breakpoint
ALTER TABLE "dataset_files" ADD CONSTRAINT "dataset_files_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dryad_dataset_details" ADD CONSTRAINT "dryad_dataset_details_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dryad_dataset_file_details" ADD CONSTRAINT "dryad_dataset_file_details_dataset_file_id_dataset_files_id_fk" FOREIGN KEY ("dataset_file_id") REFERENCES "public"."dataset_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pmc_dataset_details" ADD CONSTRAINT "pmc_dataset_details_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pmc_dataset_file_details" ADD CONSTRAINT "pmc_dataset_file_details_dataset_file_id_dataset_files_id_fk" FOREIGN KEY ("dataset_file_id") REFERENCES "public"."dataset_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dataset_files_dataset_id" ON "dataset_files" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX "idx_datasets_article_id" ON "datasets" USING btree ("article_id");--> statement-breakpoint
ALTER TABLE "ai_column_categorization_results" ADD CONSTRAINT "ai_column_categorization_results_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_column_categorization_results" ADD CONSTRAINT "ai_column_categorization_results_dataset_file_id_dataset_files_id_fk" FOREIGN KEY ("dataset_file_id") REFERENCES "public"."dataset_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_meta_analysis_results" ADD CONSTRAINT "ai_meta_analysis_results_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_review_results" ADD CONSTRAINT "ai_review_results_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_review_results" ADD CONSTRAINT "ai_review_results_dataset_file_id_dataset_files_id_fk" FOREIGN KEY ("dataset_file_id") REFERENCES "public"."dataset_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- =============================================
-- DATA MIGRATION: Populate unified tables from existing source-specific tables
-- =============================================

-- Insert Dryad datasets preserving IDs (so existing FK references in AI tables still work)
INSERT INTO datasets (id, source, ext_id, doi, title, abstract, journal_issn,
  publication_date, download_status, analysis_status, is_meta_analysis,
  article_id, indexed_timestamp, updated_timestamp)
SELECT id, 'dryad', ext_id::text, dataset_doi, title, abstract, journal_issn,
  dryad_publication_date, download_status, analysis_status, is_meta_analysis,
  (SELECT a.id FROM articles a WHERE a.dryad_dataset_id = dryad_datasets.id LIMIT 1),
  indexed_timestamp, updated_timestamp
FROM dryad_datasets;--> statement-breakpoint

-- Reset datasets sequence past max Dryad ID before PMC insert
SELECT setval('datasets_id_seq', COALESCE((SELECT MAX(id) FROM datasets), 1));--> statement-breakpoint

-- Insert PMC datasets (get new IDs)
INSERT INTO datasets (source, ext_id, doi, title, abstract, journal_issn,
  publication_date, download_status, analysis_status, is_meta_analysis,
  article_id, indexed_timestamp, updated_timestamp)
SELECT 'pmc', ext_pmc_id, doi, title, abstract, journal_issn,
  pmc_publication_date, download_status, analysis_status, is_meta_analysis,
  article_id, indexed_timestamp, updated_timestamp
FROM pmc_datasets;--> statement-breakpoint

-- Populate dryad_dataset_details
INSERT INTO dryad_dataset_details (dataset_id, ext_id_numeric, dataset_doi,
  usage_notes, primary_article_url, dryad_last_modified_date,
  latest_version_id, original_file_size)
SELECT id, ext_id, dataset_doi, usage_notes, primary_article_url,
  dryad_last_modified_date, latest_version_id, original_file_size
FROM dryad_datasets;--> statement-breakpoint

-- Populate pmc_dataset_details
INSERT INTO pmc_dataset_details (dataset_id, pmc_version, ext_pmid,
  author_string, num_citations, license, is_retracted,
  full_pdf_url, supplemental_file_urls)
SELECT d.id, p.pmc_version, p.ext_pmid, p.author_string, p.num_citations,
  p.license, p.is_retracted, p.full_pdf_url, p.supplemental_file_urls
FROM pmc_datasets p
JOIN datasets d ON d.source = 'pmc' AND d.ext_id = p.ext_pmc_id;--> statement-breakpoint

-- Insert Dryad excel files into dataset_files preserving IDs
INSERT INTO dataset_files (id, dataset_id, filename, file_type, size, download_status)
SELECT id, dryad_dataset_id, filename, 'excel', size, download_status
FROM dryad_excel_files;--> statement-breakpoint

-- Set the sequence past the max dryad_excel_files ID before inserting readme/PMC files
SELECT setval('dataset_files_id_seq', COALESCE((SELECT MAX(id) FROM dryad_excel_files), 1));--> statement-breakpoint

-- Insert Dryad readme files into dataset_files (new IDs)
INSERT INTO dataset_files (dataset_id, filename, file_type, size, download_status)
SELECT dryad_dataset_id, filename, 'readme', size, download_status
FROM dryad_readme_files;--> statement-breakpoint

-- Insert PMC data files into dataset_files (new IDs)
INSERT INTO dataset_files (dataset_id, filename, file_type, size, download_status)
SELECT d.id, p.filename, p.file_type::text, p.size, p.download_status
FROM pmc_data_files p
JOIN pmc_datasets pd ON p.pmc_dataset_id = pd.id
JOIN datasets d ON d.source = 'pmc' AND d.ext_id = pd.ext_pmc_id;--> statement-breakpoint

-- Reset dataset_files sequence to max ID
SELECT setval('dataset_files_id_seq', COALESCE((SELECT MAX(id) FROM dataset_files), 1));--> statement-breakpoint

-- Populate dryad_dataset_file_details (from dryad_excel_files, IDs preserved)
INSERT INTO dryad_dataset_file_details (dataset_file_id, ext_file_id)
SELECT id, ext_file_id
FROM dryad_excel_files;--> statement-breakpoint

-- Populate pmc_dataset_file_details
INSERT INTO pmc_dataset_file_details (dataset_file_id, s3_url)
SELECT df.id, p.s3_url
FROM pmc_data_files p
JOIN pmc_datasets pd ON p.pmc_dataset_id = pd.id
JOIN datasets d ON d.source = 'pmc' AND d.ext_id = pd.ext_pmc_id
JOIN dataset_files df ON df.dataset_id = d.id AND df.filename = p.filename;--> statement-breakpoint

-- =============================================
-- DATA BACKFILL: Populate unified IDs in AI cache tables
-- Since Dryad IDs were preserved, the backfill is trivial
-- =============================================
UPDATE ai_review_results SET dataset_id = dryad_dataset_id, dataset_file_id = dryad_excel_file_id;--> statement-breakpoint
UPDATE ai_column_categorization_results SET dataset_id = dryad_dataset_id, dataset_file_id = dryad_excel_file_id;--> statement-breakpoint
UPDATE ai_meta_analysis_results SET dataset_id = dryad_dataset_id;