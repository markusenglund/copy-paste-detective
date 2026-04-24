import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { datasets } from "../datasets/unifiedSchema";
import { datasetFiles } from "../datasetFiles/schema";

export type FormulaRelationship = {
  resultColumn: string;
  expression: string;
  description: string;
};

export const aiFormulaRelationshipResults = pgTable(
  "ai_formula_relationship_results",
  {
    id: serial("id").primaryKey(),
    sheetName: text("sheet_name").notNull(),
    prompt: text("prompt").notNull(),
    model: text("model").notNull(),
    relationships: jsonb("relationships")
      .notNull()
      .$type<FormulaRelationship[]>(),
    explanation: text("explanation"),
    hash: text("hash").notNull(),
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
);

export type AiFormulaRelationshipResultRow =
  typeof aiFormulaRelationshipResults.$inferSelect;
