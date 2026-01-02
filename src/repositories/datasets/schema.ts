import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  timestamp,
} from "drizzle-orm/pg-core";
import { analysisStatusEnum, downloadStatusEnum } from "../../db/shared/enums";

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
  analysisStatus: analysisStatusEnum("analysis_status")
    .notNull()
    .default("not_analyzed"),
  indexedTimestamp: timestamp("indexed_timestamp").notNull(),
  updatedTimestamp: timestamp("updated_timestamp").notNull(),
});
