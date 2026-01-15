ALTER TABLE "article_authors" ALTER COLUMN "article_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "article_authors" ALTER COLUMN "author_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "article_authors" ALTER COLUMN "institution_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "article_authors" ALTER COLUMN "institution_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "article_funders" ALTER COLUMN "article_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "article_funders" ALTER COLUMN "funder_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "doi" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "citation_normalized_percentile" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "cited_by_percentile_year_min" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "dryad_dataset_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "dryad_dataset_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "field" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "subfield" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "topic" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "journal_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "journal_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "authors" ALTER COLUMN "ext_openalex_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "institutions" ALTER COLUMN "openalex_ext_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "institutions" ALTER COLUMN "display_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "institutions" ALTER COLUMN "country_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "article_authors" ADD CONSTRAINT "article_authors_article_id_author_id_unique" UNIQUE("article_id","author_id");--> statement-breakpoint
ALTER TABLE "article_funders" ADD CONSTRAINT "article_funders_article_id_funder_id_unique" UNIQUE("article_id","funder_id");