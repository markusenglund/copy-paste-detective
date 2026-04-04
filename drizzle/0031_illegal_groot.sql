ALTER TABLE "pmc_datasets" ADD COLUMN "article_id" integer;--> statement-breakpoint
ALTER TABLE "pmc_datasets" ADD CONSTRAINT "pmc_datasets_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pmc_datasets_article_id" ON "pmc_datasets" USING btree ("article_id");