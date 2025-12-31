import { pgEnum } from "drizzle-orm/pg-core";

export const downloadStatusEnum = pgEnum("download_status", [
  "not_started",
  "in_progress",
  "failed",
  "completed",
]);

export type DownloadStatus = (typeof downloadStatusEnum.enumValues)[number];

