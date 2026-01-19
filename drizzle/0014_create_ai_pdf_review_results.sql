CREATE TABLE "ai_pdf_review_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"ai_review_result_id" integer NOT NULL,
	"article_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"model" text NOT NULL,
	"impact_score" integer NOT NULL,
	"response" text NOT NULL,
	"hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_pdf_review_results_ai_review_result_id_unique" UNIQUE("ai_review_result_id"),
	CONSTRAINT "ai_pdf_review_results_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
ALTER TABLE "ai_pdf_review_results" ADD CONSTRAINT "ai_pdf_review_results_ai_review_result_id_ai_review_results_id_fk" FOREIGN KEY ("ai_review_result_id") REFERENCES "public"."ai_review_results"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_pdf_review_results" ADD CONSTRAINT "ai_pdf_review_results_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_ai_pdf_review_results_ai_review" ON "ai_pdf_review_results" USING btree ("ai_review_result_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_pdf_review_results_article" ON "ai_pdf_review_results" USING btree ("article_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_pdf_review_results_hash" ON "ai_pdf_review_results" USING btree ("hash");
