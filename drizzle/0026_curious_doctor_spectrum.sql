CREATE TABLE "dataset_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"dataset_id" integer NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_dataset_tag" UNIQUE("dataset_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "dataset_tags" ADD CONSTRAINT "dataset_tags_dataset_id_dryad_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."dryad_datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset_tags" ADD CONSTRAINT "dataset_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dataset_tags_dataset_id" ON "dataset_tags" USING btree ("dataset_id");--> statement-breakpoint
INSERT INTO "tags" ("id", "name", "color") VALUES
  ('no-action', 'No Action', '#6B7280'),
  ('on-pubpeer', 'On Pubpeer', '#3B82F6'),
  ('author-response', 'Author response', '#F59E0B'),
  ('concluded', 'Concluded', '#10B981'),
  ('in-triage', 'In Triage', '#8B5CF6');