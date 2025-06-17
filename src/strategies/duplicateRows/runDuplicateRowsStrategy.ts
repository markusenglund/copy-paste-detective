import { findDuplicateRows } from "../../detection";
import {
  DuplicateRowsResult,
  StrategyName,
  StrategyDependencies,
} from "../../types/strategies";
import { ExcelFileData } from "../../types/ExcelFileData";
import { categorizeColumnsWithGemini } from "../../ai/GeminiColumnCategorizer";

async function runDuplicateRowsStrategy(
  excelFileData: ExcelFileData,
  dependencies?: StrategyDependencies,
): Promise<DuplicateRowsResult> {
  const startTime = performance.now();

  const allDuplicateRows = [];

  // Use injected categorizeColumns function or default to Gemini
  const categorizeColumns =
    dependencies?.categorizeColumns || categorizeColumnsWithGemini;

  for (const sheet of excelFileData.sheets) {
    const columnCategorization = await categorizeColumns({
      sheet,
      excelFileData,
    });
    const { duplicateRows } = findDuplicateRows(sheet, columnCategorization);
    allDuplicateRows.push(...duplicateRows);
  }

  const executionTime = performance.now() - startTime;

  return {
    name: StrategyName.DuplicateRows,
    executionTime,
    duplicateRows: allDuplicateRows,
  };
}

export { runDuplicateRowsStrategy };
