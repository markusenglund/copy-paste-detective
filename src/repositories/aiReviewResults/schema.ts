import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { dryadDatasets } from "../datasets/schema";
import { dryadExcelFiles } from "../excelFiles/schema";

export const aiReviewResults = pgTable("ai_review_results", {
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
  explanation: text("explanation").notNull(),
  falsePositiveTheory: text("false_positive_theory").notNull(),
  suspicionScore: integer("suspicion_score").notNull(),
  impactScore: integer("impact_score").notNull(),
  hash: text("hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

