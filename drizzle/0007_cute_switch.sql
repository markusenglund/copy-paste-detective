ALTER TYPE "public"."download_status" ADD VALUE 'api_forbidden';--> statement-breakpoint
ALTER TYPE "public"."download_status" ADD VALUE 'api_not_found';--> statement-breakpoint
ALTER TABLE "dryad_excel_files" ADD CONSTRAINT "dryad_excel_files_ext_file_id_unique" UNIQUE("ext_file_id");--> statement-breakpoint
ALTER TABLE "dryad_readme_files" ADD CONSTRAINT "dryad_readme_files_ext_file_id_unique" UNIQUE("ext_file_id");