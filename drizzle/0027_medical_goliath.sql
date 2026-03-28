ALTER TABLE "human_reviews" DROP CONSTRAINT "human_reviews_prosecution_status_id_prosecution_statuses_id_fk";
--> statement-breakpoint
ALTER TABLE "human_reviews" DROP COLUMN "prosecution_status_id";--> statement-breakpoint
ALTER TABLE "prosecution_statuses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "prosecution_statuses" CASCADE;
