import { pgTable, serial, text, integer, index } from "drizzle-orm/pg-core";
import { downloadStatusEnum } from "../../db/shared/enums";
import { dryadDatasets } from "../datasets/schema";

export const dryadExcelFiles = pgTable(
  "dryad_excel_files",
  {
    id: serial("id").primaryKey(),
    dryadDatasetId: integer("dryad_dataset_id")
      .notNull()
      .references(() => dryadDatasets.id, { onDelete: "cascade" }),
    extFileId: integer("ext_file_id").notNull().unique(),
    filename: text("filename").notNull(),
    size: integer("size").notNull(),
    downloadStatus: downloadStatusEnum("download_status")
      .notNull()
      .default("not_started"),
  },
  (table) => ({
    datasetIdIdx: index("excel_files_dataset_id_idx").on(table.dryadDatasetId),
  }),
);
