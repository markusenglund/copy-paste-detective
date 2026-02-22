import path from "path";

import xlsx from "xlsx";
import { Sheet } from "../entities/Sheet";
import { ExcelFileData } from "../types/ExcelFileData";
import { DryadDatasetWithFiles } from "../repositories/datasets/datasetsRepository";
import {
  maxNumRowsToAnalyze,
  maxSheetsPerExcelFile,
  minNumDataRows,
} from "../config/config";
import { logger } from "./logger";
import { readTextFile } from "./readTextFile";
import { storagePaths } from "./paths/storagePaths";

export function loadExcelFileFromDryadIndex(
  dataset: DryadDatasetWithFiles,
  fileIndex: number = 0,
): ExcelFileData {
  // Validate file index range
  if (fileIndex >= dataset.excelFiles.length) {
    throw new Error(
      `Invalid file index: ${fileIndex}. Available files: 0-${dataset.excelFiles.length - 1}`,
    );
  }
  const datasetFolder = storagePaths.dryadDataset(dataset.extId);
  const selectedFile = dataset.excelFiles[fileIndex];
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
      logger.info(`Skipping sheet '${sheetName}' due to error: ${err.message}`);
    }
  });
  let dataDescription: string | undefined;
  if (dataset.readmeFile) {
    const readmePath = path.join(datasetFolder, dataset.readmeFile.filename);
    try {
      dataDescription = readTextFile(readmePath);
    } catch (err) {
      logger.error(
        `Failed to read README file for dataset ${dataset.extId}: ${err.message}`,
      );
    }
  }
  if (!dataDescription && dataset.usageNotes) {
    dataDescription = dataset.usageNotes;
  }
  if (!dataDescription) {
    throw new Error(
      `Dataset ${dataset.extId} has no README or usage notes available. Bailing out...`,
    );
  }

  return {
    sheets,
    excelFileName: selectedFile.filename,
    excelFilePath: excelPath,
    articleName: dataset.title,
    dataDescription,
    abstract: dataset.abstract ?? undefined,
    extId: String(dataset.extId),
    dryadDatasetId: dataset.id,
    dryadExcelFileId: selectedFile.id,
  };
}
