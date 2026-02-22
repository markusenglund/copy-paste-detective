ALTER TABLE "human_reviews" DROP CONSTRAINT "human_reviews_dryad_dataset_id_unique";--> statement-breakpoint
ALTER TABLE "human_reviews" ADD COLUMN "user_id" integer;--> statement-breakpoint
UPDATE "human_reviews" SET "user_id" = 1;--> statement-breakpoint
ALTER TABLE "human_reviews" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "human_reviews" ADD COLUMN "is_latest_review" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_reviews" ADD CONSTRAINT "uq_human_reviews_dataset_user" UNIQUE("dryad_dataset_id","user_id");