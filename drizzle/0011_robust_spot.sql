ALTER TABLE "article_authors" DROP CONSTRAINT "article_authors_article_id_articles_id_fk";
--> statement-breakpoint
ALTER TABLE "article_authors" DROP CONSTRAINT "article_authors_author_id_authors_id_fk";
--> statement-breakpoint
ALTER TABLE "article_authors" DROP CONSTRAINT "article_authors_institution_id_institutions_id_fk";
--> statement-breakpoint
ALTER TABLE "article_funders" DROP CONSTRAINT "article_funders_article_id_articles_id_fk";
--> statement-breakpoint
ALTER TABLE "article_funders" DROP CONSTRAINT "article_funders_funder_id_funders_id_fk";
--> statement-breakpoint
ALTER TABLE "article_authors" ADD CONSTRAINT "article_authors_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_authors" ADD CONSTRAINT "article_authors_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_authors" ADD CONSTRAINT "article_authors_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_funders" ADD CONSTRAINT "article_funders_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_funders" ADD CONSTRAINT "article_funders_funder_id_funders_id_fk" FOREIGN KEY ("funder_id") REFERENCES "public"."funders"("id") ON DELETE cascade ON UPDATE no action;