CREATE TABLE "pdf_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"filename" text NOT NULL,
	"size" integer NOT NULL,
	"url" text,
	"created_timestamp" timestamp DEFAULT now() NOT NULL,
	"updated_timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pdf_files_article_id_unique" UNIQUE("article_id")
);
--> statement-breakpoint
ALTER TABLE "pdf_files" ADD CONSTRAINT "pdf_files_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;