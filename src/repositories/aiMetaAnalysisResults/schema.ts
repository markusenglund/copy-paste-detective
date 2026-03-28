import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { dryadDatasets } from "../datasets/schema";

export const aiMetaAnalysisResults = pgTable("ai_meta_analysis_results", {
  id: serial("id").primaryKey(),
  dryadDatasetId: integer("dryad_dataset_id")
    .notNull()
    .references(() => dryadDatasets.id),
  prompt: text("prompt").notNull(),
  model: text("model").notNull(),
  reasoning: text("reasoning").notNull(),
  isMetaAnalysis: boolean("is_meta_analysis").notNull(),
  hash: text("hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
