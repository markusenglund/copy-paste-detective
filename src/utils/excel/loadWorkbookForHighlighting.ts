import ExcelJS from "exceljs";
import fs from "fs";
import { logger } from "../logger.js";
import xlsx from "xlsx";
/**
 * Loads an Excel workbook for highlighting.
 * If output file already exists, uses it as base to preserve previous highlights.
 * Otherwise, copies original file to output location first.
 */
export async function loadWorkbookForHighlighting(
  originalFilePath: string,
  outputFilePath: string,
): Promise<ExcelJS.Workbook> {
  const baseFilePath = fs.existsSync(outputFilePath)
    ? outputFilePath
    : originalFilePath;

  if (baseFilePath === originalFilePath) {
    logger.info(
      `Creating new highlighted file from original: ${outputFilePath}`,
    );
    if (baseFilePath.endsWith(".xlsx")) {
      fs.copyFileSync(originalFilePath, outputFilePath);
    } else if (baseFilePath.endsWith(".xls")) {
      // Convert .xls to .xlsx since exceljs doesn't support .xls
      const workBook = xlsx.readFile(originalFilePath);
      xlsx.writeFile(workBook, outputFilePath, { bookType: "xlsx" });
    }
  } else {
    logger.info(`Using existing highlighted file as base: ${outputFilePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(outputFilePath);
  return workbook;
}
