import {
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { dryadDatasets } from "../datasets/schema";
import { journals } from "../journals/schema";
import { authors } from "../authors/schema";
import { funders } from "../funders/schema";
import { institutions } from "../institutions/schema";
import { downloadStatusEnum } from "../../db/shared/enums";

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    doi: text("doi").unique(),
    extOpenalexId: text("ext_openalex_id").notNull().unique(),
    title: text("title").notNull(),
    publicationDate: date("publication_date"),
    numCitations: integer("num_citations").notNull(),
    citationNormalizedPercentile: decimal("citation_normalized_percentile", {
      mode: "number",
    }),
    citedByPercentileYearMin: decimal("cited_by_percentile_year_min", {
      mode: "number",
    }),
    fullPdfUrl: text("full_pdf_url"),
    pdfDownloadStatus: downloadStatusEnum("pdf_download_status"),
    field: text("field"),
    subfield: text("subfield"),
    topic: text("topic"),
    dryadDatasetId: integer("dryad_dataset_id").references(
      () => dryadDatasets.id,
    ),
    journalId: integer("journal_id").references(() => journals.id),
    createdTimestamp: timestamp("created_timestamp").notNull().defaultNow(),
    updatedTimestamp: timestamp("updated_timestamp").notNull().defaultNow(),
  },
  (table) => [
    index("idx_articles_publication_date").on(table.publicationDate),
    index("idx_articles_num_citations").on(table.numCitations),
    index("idx_articles_citation_percentile").on(
      table.citationNormalizedPercentile,
    ),
    index("idx_articles_dryad_dataset_id").on(table.dryadDatasetId),
    index("idx_articles_journal_id").on(table.journalId),
    index("idx_articles_field").on(table.field),
  ],
);

export const authorPositionEnum = pgEnum("author_position", [
  "first",
  "middle",
  "last",
]);
export const articleAuthors = pgTable(
  "article_authors",
  {
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "cascade" }),
    authorPosition: authorPositionEnum("author_position").notNull(),
    institutionId: integer("institution_id").references(() => institutions.id, {
      onDelete: "set null",
    }),
    createdTimestamp: timestamp("created_timestamp").notNull().defaultNow(),
    updatedTimestamp: timestamp("updated_timestamp").notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.articleId, table.authorId),
    index("idx_article_authors_article_position").on(
      table.articleId,
      table.authorPosition,
    ),
  ],
);

export const articleFunders = pgTable(
  "article_funders",
  {
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    funderId: integer("funder_id")
      .notNull()
      .references(() => funders.id, { onDelete: "cascade" }),
  },
  (table) => [unique().on(table.articleId, table.funderId)],
);

export type ArticleInsert = typeof articles.$inferInsert;
export type ArticleAuthorInsert = typeof articleAuthors.$inferInsert;
export type ArticleFunderInsert = typeof articleFunders.$inferInsert;
export type Article = typeof articles.$inferSelect;
