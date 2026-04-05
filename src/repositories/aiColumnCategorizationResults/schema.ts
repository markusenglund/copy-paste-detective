import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { dryadDatasets } from "../datasets/schema";
import { dryadExcelFiles } from "../excelFiles/schema";
import { datasets } from "../datasets/unifiedSchema";
import { datasetFiles } from "../datasetFiles/schema";

export const aiColumnCategorizationResults = pgTable(
  "ai_column_categorization_results",
  {
    id: serial("id").primaryKey(),
    dryadDatasetId: integer("dryad_dataset_id").references(
      () => dryadDatasets.id,
    ),
    dryadExcelFileId: integer("dryad_excel_file_id").references(
      () => dryadExcelFiles.id,
    ),
    sheetName: text("sheet_name").notNull(),
    prompt: text("prompt").notNull(),
    model: text("model").notNull(),
    motivation: text("motivation").notNull(),
    includedColumnNames: text("included_column_names").array().notNull(),
    excludedColumnNames: text("excluded_column_names").array().notNull(),
    hash: text("hash").notNull(),
    datasetId: integer("dataset_id").references(() => datasets.id),
    datasetFileId: integer("dataset_file_id").references(() => datasetFiles.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
);
