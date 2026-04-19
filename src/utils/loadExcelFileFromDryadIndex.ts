import path from "path";

import xlsx from "xlsx";
import { Sheet } from "../entities/Sheet";
import { DryadExcelFileData } from "../types/ExcelFileData";
import { DryadDatasetWithFiles } from "../repositories/datasets/unifiedDatasetsRepository";
import {
  maxNumRowsToAnalyze,
  maxSheetsPerExcelFileForCopyPasteCheck,
  minNumDataRows,
} from "../config/config";
import { logger } from "./logger";
import { readTextFile } from "./readTextFile";
import { storagePaths } from "./paths/storagePaths";

export function loadExcelFileFromDryadIndex(
  dataset: DryadDatasetWithFiles,
  fileIndex: number = 0,
  maxSheets: number = maxSheetsPerExcelFileForCopyPasteCheck,
): DryadExcelFileData {
  const excelFiles = dataset.dataFiles.filter((f) => f.fileType === "excel");
  // Validate file index range
  if (fileIndex >= excelFiles.length) {
    throw new Error(
      `Invalid file index: ${fileIndex}. Available files: 0-${excelFiles.length - 1}`,
    );
  }
  const datasetFolder = storagePaths.dryadDataset(
    dataset.dryadDetails.extIdNumeric,
  );
  const selectedFile = excelFiles[fileIndex];
  const excelPath = path.join(datasetFolder, selectedFile.filename);
  const workbook = xlsx.readFile(excelPath, {
    sheetRows: maxNumRowsToAnalyze,
    cellNF: true,
  });

  const sheets: Sheet[] = [];
  workbook.SheetNames.slice(0, maxSheets).forEach((sheetName) => {
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
  const readmeFile = dataset.dataFiles.find((f) => f.fileType === "readme");
  if (readmeFile) {
    const readmePath = path.join(datasetFolder, readmeFile.filename);
    try {
      dataDescription = readTextFile(readmePath);
    } catch (err) {
      logger.error(
        `Failed to read README file for dataset ${dataset.dryadDetails.extIdNumeric}: ${err.message}`,
      );
    }
  }
  if (!dataDescription && dataset.dryadDetails.usageNotes) {
    dataDescription = dataset.dryadDetails.usageNotes;
  }
  if (!dataDescription) {
    logger.warn(
      `Dataset ${dataset.dryadDetails.extIdNumeric} has no README or usage notes available, continuing without it.`,
    );
  }

  return {
    source: "dryad",
    sheets,
    excelFileName: selectedFile.filename,
    excelFilePath: excelPath,
    articleName: dataset.title,
    dataDescription,
    abstract: dataset.abstract ?? undefined,
    extId: String(dataset.dryadDetails.extIdNumeric),
    datasetId: dataset.id,
    datasetFileId: selectedFile.id,
  };
}
