ALTER TABLE "ai_pdf_review_results" DROP CONSTRAINT "ai_pdf_review_results_ai_review_result_id_ai_review_results_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_pdf_review_results" ADD CONSTRAINT "ai_pdf_review_results_ai_review_result_id_ai_review_results_id_fk" FOREIGN KEY ("ai_review_result_id") REFERENCES "public"."ai_review_results"("id") ON DELETE cascade ON UPDATE no action;