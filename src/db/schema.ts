import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const downloadStatusEnum = pgEnum("download_status", [
  "not_started",
  "in_progress",
  "failed",
  "completed",
]);

export const dryadDatasets = pgTable("dryad_datasets", {
  id: serial("id").primaryKey(),
  extId: integer("ext_id").notNull().unique(),
  datasetDoi: text("dataset_doi").notNull(),
  originalFileSize: bigint("original_file_size", { mode: "number" }),
  title: text("title").notNull(),
  abstract: text("abstract"),
  usageNotes: text("usage_notes"),
  primaryArticleUrl: text("primary_article_url"),
  journalIssn: text("journal_issn"),
  dryadPublicationDate: text("dryad_publication_date").notNull(),
  dryadLastModifiedDate: text("dryad_last_modified_date").notNull(),
  latestVersionId: integer("latest_version_id").notNull(),
  downloadStatus: downloadStatusEnum("download_status")
    .notNull()
    .default("not_started"),
  indexedTimestamp: timestamp("indexed_timestamp").notNull(),
  updatedTimestamp: timestamp("updated_timestamp").notNull(),
});

export const dryadExcelFiles = pgTable("dryad_excel_files", {
  id: serial("id").primaryKey(),
  dryadDatasetId: integer("dryad_dataset_id")
    .notNull()
    .references(() => dryadDatasets.id),
  extFileId: integer("ext_file_id").notNull(),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  downloadStatus: downloadStatusEnum("download_status")
    .notNull()
    .default("not_started"),
});

export const dryadReadmeFiles = pgTable("dryad_readme_files", {
  id: serial("id").primaryKey(),
  dryadDatasetId: integer("dryad_dataset_id")
    .notNull()
    .references(() => dryadDatasets.id),
  extFileId: integer("ext_file_id").notNull(),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  downloadStatus: downloadStatusEnum("download_status")
    .notNull()
    .default("not_started"),
});

export const dryadIndexingState = pgTable("dryad_indexing_state", {
  id: serial("id").primaryKey(),
  lastPageIndexed: integer("last_page_indexed"),
});

