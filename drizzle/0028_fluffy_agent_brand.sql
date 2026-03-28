CREATE TABLE "ai_meta_analysis_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"dryad_dataset_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"model" text NOT NULL,
	"reasoning" text NOT NULL,
	"is_meta_analysis" boolean NOT NULL,
	"hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dryad_datasets" ADD COLUMN "is_meta_analysis" boolean;--> statement-breakpoint
ALTER TABLE "ai_meta_analysis_results" ADD CONSTRAINT "ai_meta_analysis_results_dryad_dataset_id_dryad_datasets_id_fk" FOREIGN KEY ("dryad_dataset_id") REFERENCES "public"."dryad_datasets"("id") ON DELETE no action ON UPDATE no action;