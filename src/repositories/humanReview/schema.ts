import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { dryadDatasets } from "../datasets/schema";
import { users } from "../users/schema";

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
      .references(() => dryadDatasets.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    isLatestReview: boolean("is_latest_review").notNull().default(true),
    verdict: verdictEnum("verdict").notNull(),
    impactScore: integer("impact_score").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_human_reviews_dryad_dataset_id").on(table.dryadDatasetId),
    index("idx_human_reviews_latest_dataset")
      .on(table.dryadDatasetId)
      .where(sql`${table.isLatestReview} = true`),
    unique("uq_human_reviews_dataset_user").on(
      table.dryadDatasetId,
      table.userId,
    ),
  ],
);
