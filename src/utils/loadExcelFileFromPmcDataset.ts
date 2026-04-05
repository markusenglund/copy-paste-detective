import path from "path";
import xlsx from "xlsx";
import { Sheet } from "../entities/Sheet";
import { ExcelFileData } from "../types/ExcelFileData";
import { DatasetWithFiles } from "../repositories/datasets/unifiedDatasetsRepository";
import {
  maxNumRowsToAnalyze,
  maxSheetsPerExcelFile,
  minNumDataRows,
} from "../config/config";
import { logger } from "./logger";
import { storagePaths } from "./paths/storagePaths";

export function loadExcelFileFromPmcDataset(
  dataset: DatasetWithFiles,
  fileIndex: number = 0,
): ExcelFileData {
  if (fileIndex >= dataset.dataFiles.length) {
    throw new Error(
      `Invalid file index: ${fileIndex}. Available files: 0-${dataset.dataFiles.length - 1}`,
    );
  }

  const datasetFolder = storagePaths.pmcArticle(dataset.extId);
  const selectedFile = dataset.dataFiles[fileIndex];
  const excelPath = path.join(datasetFolder, selectedFile.filename);

  const workbook = xlsx.readFile(excelPath, {
    sheetRows: maxNumRowsToAnalyze,
    cellNF: true,
  });

  const sheets: Sheet[] = [];
  workbook.SheetNames.slice(0, maxSheetsPerExcelFile).forEach((sheetName) => {
    const workbookSheet = workbook.Sheets[sheetName];
    try {
      const sheet = new Sheet(workbookSheet, sheetName, selectedFile.filename);
      if (sheet.numRows < minNumDataRows) {
        logger.info(
          `Skipping sheet '${sheetName}' because it has less than ${minNumDataRows} data rows`,
        );
        return;
      }
      sheets.push(sheet);
    } catch (err) {
      logger.info(
        `Skipping sheet '${sheetName}' due to error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  const dataDescription = "No data description available.";

  return {
    sheets,
    excelFileName: selectedFile.filename,
    excelFilePath: excelPath,
    articleName: dataset.title,
    dataDescription,
    abstract: dataset.abstract ?? undefined,
    extId: dataset.extId,
    datasetId: dataset.id,
    datasetFileId: selectedFile.id,
  };
}
