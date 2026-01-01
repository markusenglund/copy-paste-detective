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
export { downloadStatusEnum } from "../db/shared/enums";
export type { DownloadStatus } from "../db/shared/enums";

// Schemas
export { aiColumnCategorizationResults } from "./aiColumnCategorizationResults/schema";
export { dryadDatasets } from "./datasets/schema";
export { dryadExcelFiles } from "./excelFiles/schema";
export { dryadReadmeFiles } from "./readmeFiles/schema";
export { dryadIndexingState } from "./indexingState/schema";
export { journals } from "./journals/schema";
