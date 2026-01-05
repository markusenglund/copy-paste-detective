import {
  DuplicateRowsResult,
  StrategyName,
  StrategyDependencies,
} from "../../types/strategies";
import { ExcelFileData } from "../../types/ExcelFileData";
import { findDuplicateRows } from "./findDuplicateRows";
import { logger } from "../../utils/logger";

async function runDuplicateRowsStrategy(
  excelFileData: ExcelFileData,
  dependencies: StrategyDependencies,
): Promise<DuplicateRowsResult> {
  const startTime = performance.now();

  const allDuplicateRows = [];
  logger.trace(
    `Running duplicate rows strategy for ${excelFileData.excelFileName}`,
  );

  for (const sheet of excelFileData.sheets) {
    logger.trace(`Running duplicate rows strategy for sheet: ${sheet.name}`);
    const categorizedColumns = dependencies.categorizedColumnsBySheet.get(
      sheet.name,
    );
    if (!categorizedColumns) {
      throw new Error("Categorized columns not found for sheet: " + sheet.name);
    }
    logger.trace(
      `Found ${categorizedColumns.length} categorized columns for sheet: ${sheet.name}`,
    );
    const { duplicateRows } = findDuplicateRows(sheet, categorizedColumns);
    logger.trace(
      `Found ${duplicateRows.length} duplicate rows for sheet: ${sheet.name}`,
    );
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
