ALTER TABLE "dataset_files" ADD COLUMN "is_main_article" boolean;--> statement-breakpoint
ALTER TABLE "dataset_files" ADD COLUMN "source_url" text;--> statement-breakpoint
UPDATE "dataset_files" SET "is_main_article" = true WHERE "file_type" = 'pdf';--> statement-breakpoint
INSERT INTO "dataset_files" ("dataset_id", "source", "filename", "file_type", "size", "download_status", "is_main_article", "source_url")
SELECT d.id, 'dryad'::dataset_source, pf.filename, 'pdf', pf.size,
  COALESCE(a.pdf_download_status, 'completed')::download_status,
  true, pf.url
FROM "pdf_files" pf
JOIN "articles" a ON pf.article_id = a.id
JOIN "datasets" d ON d.article_id = a.id AND d.source = 'dryad'
ON CONFLICT DO NOTHING;--> statement-breakpoint
DROP TABLE "pdf_files" CASCADE;--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN "pdf_download_status";