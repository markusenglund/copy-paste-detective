import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  index,
} from "drizzle-orm/pg-core";
import { dataFileTypeEnum, downloadStatusEnum } from "../../db/shared/enums";
import { pmcDatasets } from "../pmcDatasets/schema";

export const pmcDataFiles = pgTable(
  "pmc_data_files",
  {
    id: serial("id").primaryKey(),
    pmcDatasetId: integer("pmc_dataset_id")
      .notNull()
      .references(() => pmcDatasets.id),
    filename: text("filename").notNull(),
    fileType: dataFileTypeEnum("file_type").notNull(),
    s3Url: text("s3_url").notNull().unique(),
    size: bigint("size", { mode: "number" }).notNull(),
    downloadStatus: downloadStatusEnum("download_status")
      .notNull()
      .default("not_started"),
  },
  (table) => ({
    pmcDatasetIdIdx: index("pmc_data_files_pmc_dataset_id_idx").on(
      table.pmcDatasetId,
    ),
  }),
);
