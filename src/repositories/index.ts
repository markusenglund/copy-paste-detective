/**
 * Barrel file re-exporting all database schemas.
 *
 * This file exists because:
 * 1. drizzle.config.ts needs a single import point for schema discovery during migrations
 * 2. src/db/index.ts needs to import all schemas to configure the Drizzle client
 *
 * Without this, we'd need to use glob patterns or maintain multiple import paths.
 */

// Shared enums
export {
  datasetSourceEnum,
  downloadStatusEnum,
  analysisStatusEnum,
  dataFileTypeEnum,
} from "../db/shared/enums";
export type { DownloadStatus } from "../db/shared/enums";

// Schemas
export { aiColumnCategorizationResults } from "./aiColumnCategorizationResults/schema";
export { aiReviewResults } from "./aiReviewResults/schema";
export { aiMetaAnalysisResults } from "./aiMetaAnalysisResults/schema";
export { aiPdfReviewResults } from "./aiPdfReviewResults/schema";
export { tags, datasetTags } from "./datasets/tagsSchema";
export { dryadDatasets } from "./datasets/schema";
export { dryadExcelFiles } from "./excelFiles/schema";
export { dryadReadmeFiles } from "./readmeFiles/schema";
export { dryadIndexingState } from "./indexingState/schema";
export { journals } from "./journals/schema";
export {
  articles,
  articleAuthors,
  articleFunders,
  authorPositionEnum,
} from "./articles/schema";
export { authors } from "./authors/schema";
export { funders } from "./funders/schema";
export { institutions } from "./institutions/schema";
export { verdictEnum, humanReviews } from "./humanReview/schema";
export { users } from "./users/schema";
export { pmcIndexingState } from "./pmcIndexingState/schema";

// Unified tables
export { datasets } from "./datasets/unifiedSchema";
export { dryadDatasetDetails } from "./datasets/dryadDetailsSchema";
export { pmcDatasetDetails } from "./datasets/pmcDetailsSchema";
export { datasetFiles } from "./datasetFiles/schema";
export { dryadDatasetFileDetails } from "./datasetFiles/dryadDetailsSchema";
export { pmcDatasetFileDetails } from "./datasetFiles/pmcDetailsSchema";
