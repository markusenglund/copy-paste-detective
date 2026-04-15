import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { datasetSourceEnum, downloadStatusEnum } from "../../db/shared/enums";
import { datasets } from "../datasets/unifiedSchema";

export const datasetFiles = pgTable(
  "dataset_files",
  {
    id: serial("id").primaryKey(),
    datasetId: integer("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    source: datasetSourceEnum("source").notNull(),
    filename: text("filename").notNull(),
    fileType: text("file_type").$type<"excel" | "readme" | "pdf">().notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    downloadStatus: downloadStatusEnum("download_status")
      .notNull()
      .default("not_started"),
    isMainArticle: boolean("is_main_article").notNull(),
    sourceUrl: text("source_url"),
  },
  (table) => [index("idx_dataset_files_dataset_id").on(table.datasetId)],
);
