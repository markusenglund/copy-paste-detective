import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { dryadDatasets } from "../datasets/schema";
import { datasets } from "../datasets/unifiedSchema";

export const aiMetaAnalysisResults = pgTable("ai_meta_analysis_results", {
  id: serial("id").primaryKey(),
  dryadDatasetId: integer("dryad_dataset_id").references(
    () => dryadDatasets.id,
  ),
  datasetId: integer("dataset_id").references(() => datasets.id, {
    onDelete: "cascade",
  }),
  prompt: text("prompt").notNull(),
  model: text("model").notNull(),
  reasoning: text("reasoning").notNull(),
  isMetaAnalysis: boolean("is_meta_analysis").notNull(),
  hash: text("hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
