import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { dryadDatasets } from "../datasets/schema";
import { dryadExcelFiles } from "../excelFiles/schema";

export const aiReviewResults = pgTable(
  "ai_review_results",
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
    response: text("response").notNull(),
    truePositiveProbability: numeric("true_positive_probability", {
      mode: "number",
    }).notNull(),
    hash: text("hash").notNull(),
    isLatestReview: boolean("is_latest_review").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // THE CRITICAL UNIQUE CONSTRAINT - prevents multiple latest reviews per sheet
    latestPerSheetIdx: uniqueIndex("ai_review_results_latest_per_sheet_idx")
      .on(table.dryadExcelFileId, table.sheetName)
      .where(sql`${table.isLatestReview} = true`),

    // Regular index for fast filtering
    isLatestIdx: index("ai_review_results_is_latest_idx")
      .on(table.isLatestReview)
      .where(sql`${table.isLatestReview} = true`),

    latestByDatasetIdx: index("idx_ai_review_results_latest_dataset")
      .on(table.dryadDatasetId)
      .where(sql`${table.isLatestReview} = true`),
  }),
);
