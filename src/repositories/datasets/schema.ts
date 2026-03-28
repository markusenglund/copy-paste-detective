import {
  boolean,
  pgTable,
  serial,
  text,
  integer,
  bigint,
  timestamp,
  unique,
  index,
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
  isMetaAnalysis: boolean("is_meta_analysis"),
  indexedTimestamp: timestamp("indexed_timestamp").notNull().defaultNow(),
  updatedTimestamp: timestamp("updated_timestamp").notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

export const datasetTags = pgTable(
  "dataset_tags",
  {
    id: serial("id").primaryKey(),
    datasetId: integer("dataset_id")
      .notNull()
      .references(() => dryadDatasets.id),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_dataset_tag").on(table.datasetId, table.tagId),
    index("idx_dataset_tags_dataset_id").on(table.datasetId),
  ],
);
