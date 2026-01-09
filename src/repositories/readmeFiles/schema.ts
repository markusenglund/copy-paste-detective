import { pgTable, serial, text, integer, index } from "drizzle-orm/pg-core";
import { downloadStatusEnum } from "../../db/shared/enums";
import { dryadDatasets } from "../datasets/schema";

export const dryadReadmeFiles = pgTable(
  "dryad_readme_files",
  {
    id: serial("id").primaryKey(),
    dryadDatasetId: integer("dryad_dataset_id")
      .notNull()
      .references(() => dryadDatasets.id),
    extFileId: integer("ext_file_id").notNull(),
    filename: text("filename").notNull(),
    size: integer("size").notNull(),
    downloadStatus: downloadStatusEnum("download_status")
      .notNull()
      .default("not_started"),
  },
  (table) => ({
    datasetIdIdx: index("readme_files_dataset_id_idx").on(table.dryadDatasetId),
  }),
);
