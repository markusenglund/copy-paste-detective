CREATE TYPE "public"."author_position" AS ENUM('first', 'middle', 'last');--> statement-breakpoint
CREATE TABLE "article_authors" (
	"article_id" serial NOT NULL,
	"author_id" serial NOT NULL,
	"author_position" "author_position" NOT NULL,
	"institution_id" serial NOT NULL,
	"created_timestamp" timestamp DEFAULT now() NOT NULL,
	"updated_timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_funders" (
	"article_id" serial NOT NULL,
	"funder_id" serial NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"doi" text NOT NULL,
	"ext_openalex_id" text NOT NULL,
	"title" text NOT NULL,
	"publication_date" date NOT NULL,
	"num_citations" integer NOT NULL,
	"citation_normalized_percentile" numeric NOT NULL,
	"cited_by_percentile_year_min" numeric NOT NULL,
	"dryad_dataset_id" serial NOT NULL,
	"full_pdf_url" text,
	"pdf_download_status" "download_status",
	"field" text NOT NULL,
	"subfield" text NOT NULL,
	"topic" text NOT NULL,
	"journal_id" serial NOT NULL,
	"created_timestamp" timestamp DEFAULT now() NOT NULL,
	"updated_timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "articles_doi_unique" UNIQUE("doi"),
	CONSTRAINT "articles_ext_openalex_id_unique" UNIQUE("ext_openalex_id")
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" serial PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"orcid" text NOT NULL,
	"ext_openalex_id" text NOT NULL,
	"created_timestamp" timestamp DEFAULT now() NOT NULL,
	"updated_timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "authors_orcid_unique" UNIQUE("orcid"),
	CONSTRAINT "authors_ext_openalex_id_unique" UNIQUE("ext_openalex_id")
);
--> statement-breakpoint
CREATE TABLE "funders" (
	"id" serial PRIMARY KEY NOT NULL,
	"openalex_ext_id" text NOT NULL,
	"ror_id" text NOT NULL,
	"display_name" text NOT NULL,
	CONSTRAINT "funders_openalex_ext_id_unique" UNIQUE("openalex_ext_id"),
	CONSTRAINT "funders_ror_id_unique" UNIQUE("ror_id")
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"openalex_ext_id" text NOT NULL,
	"ror_id" text NOT NULL,
	"display_name" text NOT NULL,
	"country_code" text NOT NULL,
	"created_timestamp" timestamp DEFAULT now() NOT NULL,
	"updated_timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "institutions_openalex_ext_id_unique" UNIQUE("openalex_ext_id"),
	CONSTRAINT "institutions_ror_id_unique" UNIQUE("ror_id")
);
--> statement-breakpoint
ALTER TABLE "dryad_datasets" ALTER COLUMN "indexed_timestamp" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "dryad_datasets" ALTER COLUMN "updated_timestamp" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "journals" ADD COLUMN "created_timestamp" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "journals" ADD COLUMN "updated_timestamp" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "article_authors" ADD CONSTRAINT "article_authors_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_authors" ADD CONSTRAINT "article_authors_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_authors" ADD CONSTRAINT "article_authors_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_funders" ADD CONSTRAINT "article_funders_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_funders" ADD CONSTRAINT "article_funders_funder_id_funders_id_fk" FOREIGN KEY ("funder_id") REFERENCES "public"."funders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_dryad_dataset_id_dryad_datasets_id_fk" FOREIGN KEY ("dryad_dataset_id") REFERENCES "public"."dryad_datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;