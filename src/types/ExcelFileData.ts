import { Sheet } from "../entities/Sheet";

export interface ExcelFileData {
  sheets: Sheet[];
  excelFileName: string;
  excelFilePath?: string; // Full path to the Excel file on disk
  articleName: string;
  abstract?: string;
  dataDescription: string;
  extId?: string;
  // Unified database IDs for AI result caching
  datasetId?: number;
  datasetFileId?: number;
  // Legacy Dryad IDs (kept for backward compat during transition)
  dryadDatasetId?: number;
  dryadExcelFileId?: number;
}
