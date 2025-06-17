import { findDuplicateValues } from "../../detection";
import {
  IndividualNumbersResult,
  StrategyName,
  StrategyDependencies,
  DuplicateRowsResult
} from "../../types/strategies";
import { ExcelFileData } from "../../types/ExcelFileData";
import { DuplicateValue } from "../../entities/DuplicateValue";
import { DuplicateCellPair } from "../../entities/DuplicateCellPair";

function areAllCellPairsAlreadyReported(
  duplicateValue: DuplicateValue,
  reportedCellPairIds: Set<string>
): boolean {
  const cells = duplicateValue.cells;

  // Generate all possible pairs from the cells
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const cellPair = new DuplicateCellPair(cells[i], cells[j]);
      if (!reportedCellPairIds.has(cellPair.id)) {
        return false; // Found a pair that hasn't been reported
      }
    }
  }

  return true; // All pairs have been reported
}

export function runIndividualNumbersStrategy(
  excelFileData: ExcelFileData,
  dependencies?: StrategyDependencies
): IndividualNumbersResult {
  const startTime = performance.now();

  // Get duplicate rows from previous results to filter them out
  const duplicateRowsResult = dependencies?.previousResults?.find(
    result => result.name === StrategyName.DuplicateRows
  ) as DuplicateRowsResult | undefined;

  const duplicateRowCellPairIds = new Set<string>();

  if (duplicateRowsResult) {
    // Collect all cell pair IDs from duplicate rows to exclude them from individual number analysis
    for (const duplicateRow of duplicateRowsResult.duplicateRows) {
      for (const cellPair of duplicateRow.duplicateCellPairs) {
        duplicateRowCellPairIds.add(cellPair.id);
      }
    }
  }

  const allDuplicateValues: DuplicateValue[] = [];

  for (const sheet of excelFileData.sheets) {
    console.log(
      `[${sheet.name}] Found ${sheet.numNumericCells} numeric values`
    );

    const { duplicateValues } = findDuplicateValues(sheet);

    // Filter out values where all cell pairs have already been reported in duplicate rows
    const filteredDuplicateValues = duplicateValues.filter(
      duplicate =>
        !areAllCellPairsAlreadyReported(duplicate, duplicateRowCellPairIds)
    );

    allDuplicateValues.push(...filteredDuplicateValues);
  }

  // Sort all duplicate values by entropy score (already sorted per sheet, but need to merge)
  allDuplicateValues.sort((a, b) => b.entropyScore - a.entropyScore);

  const executionTime = performance.now() - startTime;

  return {
    name: StrategyName.IndividualNumbers,
    executionTime,
    duplicateValues: allDuplicateValues
  };
}
