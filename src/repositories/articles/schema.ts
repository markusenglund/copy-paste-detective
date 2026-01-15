import {
  date,
  decimal,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { dryadDatasets } from "../datasets/schema";
import { journals } from "../journals/schema";
import { authors } from "../authors/schema";
import { funders } from "../funders/schema";
import { institutions } from "../institutions/schema";
import { downloadStatusEnum } from "../../db/shared/enums";

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  doi: text("doi").unique(),
  extOpenalexId: text("ext_openalex_id").notNull().unique(),
  title: text("title").notNull(),
  publicationDate: date("publication_date").notNull(),
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
});

export const authorPositionEnum = pgEnum("author_position", [
  "first",
  "middle",
  "last",
]);
export const articleAuthors = pgTable("article_authors", {
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id),
  authorId: integer("author_id")
    .notNull()
    .references(() => authors.id),
  authorPosition: authorPositionEnum("author_position").notNull(),
  institutionId: integer("institution_id").references(() => institutions.id),
  createdTimestamp: timestamp("created_timestamp").notNull().defaultNow(),
  updatedTimestamp: timestamp("updated_timestamp").notNull().defaultNow(),
});

export const articleFunders = pgTable("article_funders", {
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id),
  funderId: integer("funder_id")
    .notNull()
    .references(() => funders.id),
});

export type ArticleInsert = typeof articles.$inferInsert;
export type ArticleAuthorInsert = typeof articleAuthors.$inferInsert;
export type ArticleFunderInsert = typeof articleFunders.$inferInsert;
export type Article = typeof articles.$inferSelect;
