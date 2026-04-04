import { pgEnum } from "drizzle-orm/pg-core";

export const downloadStatusEnum = pgEnum("download_status", [
  "not_started",
  "in_progress",
  "failed",
  "completed",
  "skipped",
  "api_forbidden",
  "api_not_found",
  "manually_added",
]);

export type DownloadStatus = (typeof downloadStatusEnum.enumValues)[number];

export const analysisStatusEnum = pgEnum("analysis_status", [
  "not_analyzed",
  "not_flagged_for_review",
  "flagged_for_review",
  "reviewed_by_ai",
  "pdf_reviewed_by_ai",
  "failed",
]);

export type AnalysisStatus = (typeof analysisStatusEnum.enumValues)[number];

export const dataFileTypeEnum = pgEnum("data_file_type", ["excel"]);

export type DataFileType = (typeof dataFileTypeEnum.enumValues)[number];
