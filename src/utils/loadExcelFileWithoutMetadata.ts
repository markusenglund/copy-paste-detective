import path from "path";
import xlsx from "xlsx";
import { Sheet } from "../entities/Sheet";
import { StandaloneExcelFileData } from "../types/ExcelFileData";
import {
  maxNumRowsToAnalyze,
  maxSheetsPerExcelFile,
  minNumDataRows,
} from "../config/config";
import { logger } from "./logger";

/**
 * Load an Excel file without requiring metadata.json or README.md
 * Useful for quick analysis of standalone Excel files
 */
export function loadExcelFileWithoutMetadata(
  filePath: string,
): StandaloneExcelFileData {
  const workbook = xlsx.readFile(filePath, {
    sheetRows: maxNumRowsToAnalyze,
    cellNF: true,
  });

  const fileName = path.basename(filePath);
  const sheets: Sheet[] = [];

  workbook.SheetNames.slice(0, maxSheetsPerExcelFile).forEach((sheetName) => {
    const workbookSheet = workbook.Sheets[sheetName];
    try {
      const sheet = new Sheet(workbookSheet, sheetName, fileName);
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

  // Use filename without extension as articleName
  const articleName = path.basename(filePath, path.extname(filePath));

  return {
    source: "standalone",
    sheets,
    excelFileName: fileName,
    excelFilePath: filePath,
    articleName,
  };
}
