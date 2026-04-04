import {
  boolean,
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { analysisStatusEnum, downloadStatusEnum } from "../../db/shared/enums";

export const pmcDatasets = pgTable("pmc_datasets", {
  id: serial("id").primaryKey(),
  extPmcId: text("ext_pmc_id").notNull().unique(),
  pmcVersion: integer("pmc_version").notNull(),
  extPmid: text("ext_pmid"),
  doi: text("doi"),
  title: text("title").notNull(),
  abstract: text("abstract"),
  authorString: text("author_string"),
  journalIssn: text("journal_issn"),
  pmcPublicationDate: text("pmc_publication_date").notNull(),
  numCitations: integer("num_citations"),
  license: text("license"),
  isRetracted: boolean("is_retracted"),
  fullPdfUrl: text("full_pdf_url"),
  supplementalFileUrls: text("supplemental_file_urls").array(),
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
