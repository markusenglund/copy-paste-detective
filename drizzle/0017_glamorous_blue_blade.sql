ALTER TABLE "ai_review_results" ADD COLUMN "response" text NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_review_results" ADD COLUMN "true_positive_probability" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_review_results" DROP COLUMN "explanation";--> statement-breakpoint
ALTER TABLE "ai_review_results" DROP COLUMN "false_positive_theory";--> statement-breakpoint
ALTER TABLE "ai_review_results" DROP COLUMN "suspicion_score";--> statement-breakpoint
ALTER TABLE "ai_review_results" DROP COLUMN "impact_score";
