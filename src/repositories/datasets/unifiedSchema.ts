import {
  boolean,
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import {
  datasetSourceEnum,
  analysisStatusEnum,
  downloadStatusEnum,
} from "../../db/shared/enums";
import { articles } from "../articles/schema";

export const datasets = pgTable(
  "datasets",
  {
    id: serial("id").primaryKey(),
    source: datasetSourceEnum("source").notNull(),
    extId: text("ext_id").notNull(),
    doi: text("doi"),
    title: text("title").notNull(),
    abstract: text("abstract"),
    journalIssn: text("journal_issn"),
    publicationDate: text("publication_date").notNull(),
    downloadStatus: downloadStatusEnum("download_status")
      .notNull()
      .default("not_started"),
    analysisStatus: analysisStatusEnum("analysis_status")
      .notNull()
      .default("not_analyzed"),
    isMetaAnalysis: boolean("is_meta_analysis"),
    articleId: integer("article_id").references(() => articles.id),
    indexedTimestamp: timestamp("indexed_timestamp").notNull().defaultNow(),
    updatedTimestamp: timestamp("updated_timestamp").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_datasets_source_ext_id").on(table.source, table.extId),
    index("idx_datasets_article_id").on(table.articleId),
  ],
);
