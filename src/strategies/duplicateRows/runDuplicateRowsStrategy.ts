import { Sheet } from "../../entities/Sheet";
import { findDuplicateRows } from "../../detection";
import {
  StrategyContext,
  DuplicateRowsResult,
  StrategyName
} from "../../types/strategies";
import { categorizeColumns, ColumnCategorization } from "../../ai/geminiService";
import { readFileSync } from "fs";

async function runDuplicateRowsStrategy(
  sheets: Sheet[],
  context: StrategyContext
): Promise<DuplicateRowsResult> {
  const startTime = performance.now();

  const allDuplicateRows = [];

  // Read README.md from the excel data folder
  const readmePath = `${context.excelDataFolder}/README.md`;
  const dataDescription = readFileSync(readmePath, "utf-8");

  // Find duplicate rows if Gemini categorization is available
  for (const sheet of sheets) {
    const columnCategorization = await getColumnCategorization(
      sheet,
      context,
      dataDescription
    );
    const { duplicateRows } = findDuplicateRows(sheet, columnCategorization);

    allDuplicateRows.push(...duplicateRows);
  }

  const executionTime = performance.now() - startTime;

  return {
    name: StrategyName.DuplicateRows,
    executionTime,
    duplicateRows: allDuplicateRows
  };
}

async function getColumnCategorization(
  sheet: Sheet,
  context: StrategyContext,
  dataDescription: string
): Promise<ColumnCategorization> {
  // Extract column names and sample data for Gemini
  const columnNames = (sheet.enhancedMatrix[0] || []).map(cell =>
    String(cell.value || "")
  );
  const sampleData = sheet.enhancedMatrix
    .slice(1, 3)
    .map(row => row.map(cell => String(cell.value || "")));

  const columnCategorization = await categorizeColumns({
    paperName: context.articleName,
    excelFileName: context.excelFileName,
    dataDescription,
    columnNames,
    columnData: sampleData
  });

  console.log(
    `[${sheet.name}] Unique columns:`,
    columnCategorization.unique.join(", ")
  );
  console.log(
    `[${sheet.name}] Shared columns:`,
    columnCategorization.shared.join(", ")
  );

  return columnCategorization;
}

export { runDuplicateRowsStrategy };
