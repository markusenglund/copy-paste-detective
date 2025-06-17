import { findDuplicateRows } from "../../detection";
import {
  DuplicateRowsResult,
  StrategyName,
  StrategyDependencies,
} from "../../types/strategies";
import { ExcelFileData } from "../../types/ExcelFileData";

async function runDuplicateRowsStrategy(
  excelFileData: ExcelFileData,
  dependencies: StrategyDependencies,
): Promise<DuplicateRowsResult> {
  const startTime = performance.now();

  const allDuplicateRows = [];

  for (const sheet of excelFileData.sheets) {
    const categorizedColumns = dependencies.categorizedColumnsBySheet.get(
      sheet.name,
    );
    if (!categorizedColumns) {
      throw new Error("Categorized columns not found for sheet: " + sheet.name);
    }
    const { duplicateRows } = findDuplicateRows(sheet, categorizedColumns);
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
