import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { datasets } from "./unifiedSchema";

export const tags = pgTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

export const datasetTags = pgTable(
  "dataset_tags",
  {
    id: serial("id").primaryKey(),
    datasetId: integer("dataset_id")
      .notNull()
      .references(() => datasets.id),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_dataset_tag").on(table.datasetId, table.tagId),
    index("idx_dataset_tags_dataset_id").on(table.datasetId),
  ],
);
