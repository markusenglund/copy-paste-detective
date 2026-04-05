import { pgTable, integer } from "drizzle-orm/pg-core";
import { datasetFiles } from "./schema";

export const dryadDatasetFileDetails = pgTable("dryad_dataset_file_details", {
  datasetFileId: integer("dataset_file_id")
    .notNull()
    .unique()
    .references(() => datasetFiles.id, { onDelete: "cascade" }),
  extFileId: integer("ext_file_id").notNull().unique(),
});
