import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { dryadDatasets } from "../datasets/schema";
import { dryadExcelFiles } from "../excelFiles/schema";

export const aiColumnCategorizationResults = pgTable(
  "ai_column_categorization_results",
  {
    id: serial("id").primaryKey(),
    dryadDatasetId: integer("dryad_dataset_id")
      .notNull()
      .references(() => dryadDatasets.id),
    dryadExcelFileId: integer("dryad_excel_file_id")
      .notNull()
      .references(() => dryadExcelFiles.id),
    sheetName: text("sheet_name").notNull(),
    prompt: text("prompt").notNull(),
    model: text("model").notNull(),
    motivation: text("motivation").notNull(),
    includedColumnNames: text("included_column_names").array().notNull(),
    excludedColumnNames: text("excluded_column_names").array().notNull(),
    hash: text("hash").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
);
