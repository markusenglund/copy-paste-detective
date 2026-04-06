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
import { datasets } from "../datasets/unifiedSchema";
import { datasetFiles } from "../datasetFiles/schema";

export const aiReviewResults = pgTable(
  "ai_review_results",
  {
    id: serial("id").primaryKey(),
    sheetName: text("sheet_name").notNull(),
    prompt: text("prompt").notNull(),
    model: text("model").notNull(),
    response: text("response").notNull(),
    truePositiveProbability: numeric("true_positive_probability", {
      mode: "number",
    }).notNull(),
    hash: text("hash").notNull(),
    isLatestReview: boolean("is_latest_review").notNull().default(false),
    datasetId: integer("dataset_id").references(() => datasets.id, {
      onDelete: "cascade",
    }),
    datasetFileId: integer("dataset_file_id").references(
      () => datasetFiles.id,
      { onDelete: "cascade" },
    ),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // THE CRITICAL UNIQUE CONSTRAINT - prevents multiple latest reviews per sheet
    latestPerSheetIdx: uniqueIndex(
      "ai_review_results_latest_per_sheet_unified_idx",
    )
      .on(table.datasetFileId, table.sheetName)
      .where(sql`${table.isLatestReview} = true`),

    // Regular index for fast filtering
    isLatestIdx: index("ai_review_results_is_latest_idx")
      .on(table.isLatestReview)
      .where(sql`${table.isLatestReview} = true`),

    latestByDatasetIdx: index("idx_ai_review_results_latest_dataset_unified")
      .on(table.datasetId)
      .where(sql`${table.isLatestReview} = true`),
  }),
);
