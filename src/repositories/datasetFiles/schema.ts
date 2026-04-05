import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  index,
} from "drizzle-orm/pg-core";
import { downloadStatusEnum } from "../../db/shared/enums";
import { datasets } from "../datasets/unifiedSchema";

export const datasetFiles = pgTable(
  "dataset_files",
  {
    id: serial("id").primaryKey(),
    datasetId: integer("dataset_id")
      .notNull()
      .references(() => datasets.id),
    filename: text("filename").notNull(),
    fileType: text("file_type").$type<"excel" | "readme" | "pdf">().notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    downloadStatus: downloadStatusEnum("download_status")
      .notNull()
      .default("not_started"),
  },
  (table) => [index("idx_dataset_files_dataset_id").on(table.datasetId)],
);
