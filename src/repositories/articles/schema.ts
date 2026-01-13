import {
  date,
  decimal,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";
import { dryadDatasets } from "../datasets/schema";
import { journals } from "../journals/schema";

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  doi: text("doi").notNull().unique(),
  extOpenalexId: text("ext_openalex_id").notNull().unique(),
  title: text("title").notNull(),
  publicationDate: date("publication_date").notNull(),
  numCitations: integer("num_citations").notNull(),
  citationNormalizedPercentile: decimal(
    "citation_normalized_percentile",
  ).notNull(),
  citedByPercentileYearMin: decimal("cited_by_percentile_year_min").notNull(),
  dryadDatasetId: serial("dryad_dataset_id").references(() => dryadDatasets.id),
  fullPdfUrl: text("full_pdf_url"),
  field: text("field").notNull(),
  subfield: text("subfield").notNull(),
  topic: text("topic").notNull(),
  journalId: serial("journal_id")
    .notNull()
    .references(() => journals.id),
});

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  orcid: text("orcid").unique().notNull(),
  extOpenalexId: text("ext_openalex_id").notNull().unique(),
});

const authorPositionEnum = pgEnum("author_position", [
  "first",
  "middle",
  "last",
]);
export const articleAuthors = pgTable("article_authors", {
  articleId: serial("article_id")
    .notNull()
    .references(() => articles.id),
  authorId: serial("author_id")
    .notNull()
    .references(() => authors.id),
  authorPosition: authorPositionEnum().notNull(),
  institutionId: serial("institution_id")
    .notNull()
    .references(() => instutions.id),
});

export const funders = pgTable("funders", {
  id: serial("id").primaryKey(),
  openalexExtId: text("openalex_ext_id").notNull().unique(),
  rorId: text("ror_id").unique().notNull(),
  displayName: text("display_name").notNull(),
});

export const articleFunders = pgTable("article_funders", {
  articleId: serial("article_id")
    .notNull()
    .references(() => articles.id),
  funderId: serial("funder_id")
    .notNull()
    .references(() => funders.id),
});

export const instutions = pgTable("institutions", {
  id: serial("id").primaryKey(),
  openalexExtId: text("openalex_ext_id").notNull().unique(),
  rorId: text("ror_id").unique().notNull(),
  displayName: text("display_name").notNull(),
  countryCode: text("country_code").notNull(),
});
