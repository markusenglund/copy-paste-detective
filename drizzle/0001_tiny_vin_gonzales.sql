CREATE TABLE "journals" (
	"id" serial PRIMARY KEY NOT NULL,
	"scimago_journal_rank" integer NOT NULL,
	"title" text NOT NULL,
	"issns" text[] NOT NULL,
	"sjr_score" real,
	"avg_citations" real,
	"fields" text[] NOT NULL,
	"publisher" text
);
--> statement-breakpoint
CREATE INDEX "journals_issns_idx" ON "journals" USING gin ("issns");