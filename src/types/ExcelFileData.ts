import { Sheet } from "../entities/Sheet";

interface BaseExcelFileData {
  sheets: Sheet[];
  excelFileName: string;
  excelFilePath?: string;
  articleName: string;
  abstract?: string;
  extId?: string;
  dataDescription?: string;
}

export interface DryadExcelFileData extends BaseExcelFileData {
  source: "dryad";
  datasetId: number;
  datasetFileId: number;
}

export interface PmcExcelFileData extends BaseExcelFileData {
  source: "pmc";
  fullText?: string;
  fileCaption?: string;
  datasetId: number;
  datasetFileId: number;
}

export interface StandaloneExcelFileData extends BaseExcelFileData {
  source: "standalone";
}

export type ExcelFileData =
  | DryadExcelFileData
  | PmcExcelFileData
  | StandaloneExcelFileData;
