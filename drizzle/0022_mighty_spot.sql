CREATE TABLE "prosecution_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);

-- Add not_started status
INSERT INTO "prosecution_statuses" ("id", "name") VALUES ('not_started', 'Not Started');
--> statement-breakpoint
ALTER TABLE "human_reviews" ADD COLUMN "prosecution_status_id" text DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_prosecution_status_id_prosecution_statuses_id_fk" FOREIGN KEY ("prosecution_status_id") REFERENCES "public"."prosecution_statuses"("id") ON DELETE no action ON UPDATE no action;