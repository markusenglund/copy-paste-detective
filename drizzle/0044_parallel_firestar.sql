CREATE TABLE "ai_formula_relationship_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"sheet_name" text NOT NULL,
	"prompt" text NOT NULL,
	"model" text NOT NULL,
	"relationships" jsonb NOT NULL,
	"hash" text NOT NULL,
	"dataset_id" integer,
	"dataset_file_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_formula_relationship_results" ADD CONSTRAINT "ai_formula_relationship_results_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_formula_relationship_results" ADD CONSTRAINT "ai_formula_relationship_results_dataset_file_id_dataset_files_id_fk" FOREIGN KEY ("dataset_file_id") REFERENCES "public"."dataset_files"("id") ON DELETE cascade ON UPDATE no action;