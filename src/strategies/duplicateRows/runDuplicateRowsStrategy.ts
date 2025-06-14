import { Sheet } from "../../entities/Sheet";
import { findDuplicateRows } from "../../detection";
import {
  StrategyContext,
  DuplicateRowsResult,
  StrategyName,
  StrategyDependencies
} from "../../types/strategies";
import { categorizeColumnsWithGemini } from "../../ai/GeminiColumnCategorizer";
import { readFileSync } from "fs";

async function runDuplicateRowsStrategy(
  sheets: Sheet[],
  context: StrategyContext,
  dependencies?: StrategyDependencies
): Promise<DuplicateRowsResult> {
  const startTime = performance.now();

  const allDuplicateRows = [];

  // Use injected categorizeColumns function or default to Gemini
  const categorizeColumns = dependencies?.categorizeColumns || categorizeColumnsWithGemini;

  // Read README.md from the excel data folder
  const readmePath = `${context.excelDataFolder}/README.md`;
  const dataDescription = readFileSync(readmePath, "utf-8");

  for (const sheet of sheets) {
    const columnCategorization = await categorizeColumns({
      sheet,
      context,
      dataDescription
    });
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


export { runDuplicateRowsStrategy };
