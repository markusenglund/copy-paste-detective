import { pgTable, text, integer, bigint } from "drizzle-orm/pg-core";
import { datasets } from "./unifiedSchema";

export const dryadDatasetDetails = pgTable("dryad_dataset_details", {
  datasetId: integer("dataset_id")
    .notNull()
    .unique()
    .references(() => datasets.id, { onDelete: "cascade" }),
  extIdNumeric: integer("ext_id_numeric").notNull().unique(),
  datasetDoi: text("dataset_doi").notNull(),
  usageNotes: text("usage_notes"),
  primaryArticleUrl: text("primary_article_url"),
  dryadLastModifiedDate: text("dryad_last_modified_date").notNull(),
  latestVersionId: integer("latest_version_id").notNull(),
  originalFileSize: bigint("original_file_size", { mode: "number" }),
});
