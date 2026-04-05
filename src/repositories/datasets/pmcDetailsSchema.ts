import { boolean, pgTable, text, integer } from "drizzle-orm/pg-core";
import { datasets } from "./unifiedSchema";

export const pmcDatasetDetails = pgTable("pmc_dataset_details", {
  datasetId: integer("dataset_id")
    .notNull()
    .unique()
    .references(() => datasets.id),
  pmcVersion: integer("pmc_version").notNull(),
  extPmid: text("ext_pmid"),
  authorString: text("author_string"),
  numCitations: integer("num_citations"),
  license: text("license"),
  isRetracted: boolean("is_retracted"),
  fullPdfUrl: text("full_pdf_url"),
  supplementalFileUrls: text("supplemental_file_urls").array(),
});
