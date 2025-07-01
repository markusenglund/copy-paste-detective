import { type DuplicateValuesResult, SuspicionLevel } from "../types";
import {
  RepeatedColumnSequence,
  type Position,
} from "../entities/RepeatedColumnSequence";
import { DuplicateValue } from "../entities/DuplicateValue";
import { Sheet } from "../entities/Sheet";
import { type EnhancedCell } from "../entities/EnhancedCell";
import { calculateSequenceEntropyScore } from "../utils/entropy";
import { ColumnCategorization } from "../ai/geminiService";

export function deduplicateSortedSequences(
  repeatedSequences: RepeatedColumnSequence[],
): RepeatedColumnSequence[] {
  let previousSequence: RepeatedColumnSequence | null = null;
  const deduplicatedSortedSequences: RepeatedColumnSequence[] = [];
  for (const sequence of repeatedSequences) {
    if (previousSequence) {
      const isSameSequence =
        previousSequence.adjustedSequenceEntropyScore ===
          sequence.adjustedSequenceEntropyScore &&
        previousSequence.values.every((value, index) => {
          return value === sequence.values[index];
        });
      if (isSameSequence) {
        sequence.positions.forEach((position) => {
          // Check if position already exists in previousSequence and if not, add it
          const exists = previousSequence?.positions.find(
            (p) => p.cellId === position.cellId,
          );
          if (!exists) {
            previousSequence?.positions.push(position);
          }
        });
        continue;
      }
    }
    deduplicatedSortedSequences.push(sequence);
    previousSequence = sequence;
  }
  return deduplicatedSortedSequences;
}

export function findRepeatedSequences(
  sheet: Sheet,
  categorizedColumns: ColumnCategorization,
): RepeatedColumnSequence[] {
  // Get numeric columns that should be unique
  const uniqueColumnIndices = categorizedColumns.unique
    .flatMap((name) => sheet.getColumnIndicesOfCombinedColumnName(name))
    .filter((index) => sheet.numericColumnIndices.includes(index));

  if (uniqueColumnIndices.length === 0) {
    return [];
  }

  const matrix = sheet.invertedEnhancedMatrix;

  const repeatedSequences: RepeatedColumnSequence[] = [];
  const previouslySeenPositionsByValue = new Map<number, Position[]>();
  const checkedPositionPairs = new Set<string>();
  for (const columnIndex of uniqueColumnIndices) {
    for (let rowIndex = 0; rowIndex < matrix[columnIndex].length; rowIndex++) {
      if (repeatedSequences.length > 1000) {
        // Limit the number of sequences to avoid memory issues
        break;
      }
      const cellData = matrix[columnIndex]?.[rowIndex];
      if (cellData?.isAnalyzable) {
        const cellValue = cellData.value as number;
        const previouslySeenPositions =
          previouslySeenPositionsByValue.get(cellValue) ?? [];
        const newPosition: Position = {
          column: columnIndex,
          startRow: rowIndex,
          cellId: cellData.cellId,
        };

        if (previouslySeenPositions.length < 100) {
          for (const previouslySeenPosition of previouslySeenPositions) {
            if (
              checkedPositionPairs.has(
                `${previouslySeenPosition.column}-${previouslySeenPosition.startRow}-${columnIndex}-${rowIndex}`,
              )
            ) {
              continue;
            }
            // If the values are on the same row, skip since this is often expected to be the case in legitimate data
            if (previouslySeenPosition.startRow === rowIndex) {
              continue;
            }

            let length = 1;
            const repeatedValues: number[] = [cellValue];
            while (true) {
              const isPreviouslySeenPositionAnalyzable =
                matrix[previouslySeenPosition.column][
                  previouslySeenPosition.startRow + length
                ]?.isAnalyzable;
              if (!isPreviouslySeenPositionAnalyzable) {
                break;
              }

              const isComparingCellWithItself =
                previouslySeenPosition.column === columnIndex &&
                rowIndex === previouslySeenPosition.startRow + length;
              if (isComparingCellWithItself) {
                break;
              }
              const areValuesIdentical =
                matrix[previouslySeenPosition.column][
                  previouslySeenPosition.startRow + length
                ].value === matrix[columnIndex][rowIndex + length]?.value;
              if (!areValuesIdentical) {
                break;
              }

              repeatedValues.push(
                matrix[previouslySeenPosition.column][
                  previouslySeenPosition.startRow + length
                ].value as number,
              );
              checkedPositionPairs.add(
                `${previouslySeenPosition.column}-${previouslySeenPosition.startRow + length}-${columnIndex}-${rowIndex + length}`,
              );
              length++;
            }

            const minSequenceLength = 2;
            if (repeatedValues.length < minSequenceLength) {
              continue;
            }
            const minSequenceEntropyScore = 10;
            const sequenceEntropyScore =
              calculateSequenceEntropyScore(repeatedValues);

            if (sequenceEntropyScore <= minSequenceEntropyScore) {
              continue;
            }
            if (
              previouslySeenPosition.column === newPosition.column &&
              previouslySeenPosition.startRow + length === newPosition.startRow
            ) {
              // Skip if the repeated sequences are back-to-back
              continue;
            }
            const repeatedSequence = new RepeatedColumnSequence({
              positions: [previouslySeenPosition, newPosition],
              values: repeatedValues,
              sheet,
            });
            if (repeatedSequence.matrixSizeAdjustedEntropyScore > 2) {
              repeatedSequences.push(repeatedSequence);
            }
          }
        }
        previouslySeenPositions.push(newPosition);
        previouslySeenPositionsByValue.set(cellValue, previouslySeenPositions);
      }
    }
  }

  return repeatedSequences;
}

export function findDuplicateValues(
  sheet: Sheet,
  categorizedColumns: ColumnCategorization,
): DuplicateValuesResult {
  // Get numeric columns that should be unique
  const uniqueColumnIndices = categorizedColumns.unique
    .flatMap((name) => sheet.getColumnIndicesOfCombinedColumnName(name))
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
    .map(([value, cells]) => new DuplicateValue(value, sheet, cells))
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

export { findDuplicateRows } from "../strategies/duplicateRows/findDuplicateRows";
