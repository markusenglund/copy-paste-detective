import { pgTable, text, integer } from "drizzle-orm/pg-core";
import { datasetFiles } from "./schema";

export const pmcDatasetFileDetails = pgTable("pmc_dataset_file_details", {
  datasetFileId: integer("dataset_file_id")
    .notNull()
    .unique()
    .references(() => datasetFiles.id, { onDelete: "cascade" }),
  s3Url: text("s3_url").notNull().unique(),
  caption: text("caption"),
});
