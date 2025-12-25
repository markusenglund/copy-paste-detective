import { type DuplicateValuesResult, SuspicionLevel } from "../types";

import { DuplicateValue } from "../entities/DuplicateValue";
import { Sheet } from "../entities/Sheet";
import { type EnhancedCell } from "../entities/EnhancedCell";
import { CategorizedColumn } from "../columnCategorization/columnCategorization";

export function findDuplicateValues(
  sheet: Sheet,
  categorizedColumns: CategorizedColumn[],
): DuplicateValuesResult {
  // Get numeric columns that should be unique
  const uniqueColumnIndices = categorizedColumns
    .filter((col) => col.isIncludedInAnalysis)
    .map((col) => col.index)
    .filter((index) => sheet.numericColumnIndices.includes(index));

  if (uniqueColumnIndices.length === 0) {
    return { duplicateValues: [] };
  }

  const cellsByNumericValue = new Map<number, EnhancedCell[]>();
  sheet.enhancedMatrix.forEach((row) => {
    for (const colIndex of uniqueColumnIndices) {
      const cell = row[colIndex];
      if (cell.isAnalyzable) {
        const value = cell.value as number;
        const existingCells = cellsByNumericValue.get(value) ?? [];
        existingCells.push(cell);
        cellsByNumericValue.set(value, existingCells);
      }
    }
  });

  const duplicateValues: DuplicateValue[] = [...cellsByNumericValue.entries()]
    .filter(([_value, cells]) => cells.length > 1)
    .map(
      ([value, cells]) =>
        new DuplicateValue(
          value,
          sheet,
          cells,
          categorizedColumns[cells[0].col],
        ),
    )
    .filter((duplicateValue) =>
      [SuspicionLevel.Low, SuspicionLevel.Medium, SuspicionLevel.High].includes(
        duplicateValue.suspicionLevel,
      ),
    )
    .toSorted(
      (a, b) =>
        b.occurenceAdjustedEntropyScore - a.occurenceAdjustedEntropyScore,
    );

  return {
    duplicateValues,
  };
}
