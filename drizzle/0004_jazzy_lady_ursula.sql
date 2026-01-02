CREATE TYPE "public"."analysis_status" AS ENUM('not_analyzed', 'not_flagged_for_review', 'flagged_for_review', 'reviewed_by_ai', 'failed');--> statement-breakpoint
ALTER TABLE "dryad_datasets" ADD COLUMN "analysis_status" "analysis_status" DEFAULT 'not_analyzed' NOT NULL;
