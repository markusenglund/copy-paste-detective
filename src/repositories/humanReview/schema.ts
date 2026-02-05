import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { dryadDatasets } from "../datasets/schema";

export const verdictEnum = pgEnum("verdict", [
  "true_positive",
  "false_positive",
  "ambiguous",
]);

export const humanReviews = pgTable(
  "human_reviews",
  {
    id: serial("id").primaryKey(),
    dryadDatasetId: integer("dryad_dataset_id")
      .notNull()
      .references(() => dryadDatasets.id)
      .unique(),
    verdict: verdictEnum("verdict").notNull(),
    impactScore: integer("impact_score").notNull(),
    notes: text("notes"),
    prosecutionStatusId: text("prosecution_status_id")
      .notNull()
      .references(() => prosecutionStatuses.id)
      .default("not_started"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_human_reviews_dryad_dataset_id").on(table.dryadDatasetId),
  ],
);

export const prosecutionStatuses = pgTable("prosecution_statuses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});
