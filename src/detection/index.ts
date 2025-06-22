import { type DuplicateValuesResult, SuspicionLevel } from "../types";
import {
  RepeatedColumnSequence,
  type Position,
} from "../entities/RepeatedColumnSequence";
import { DuplicateValue } from "../entities/DuplicateValue";
import { Sheet } from "../entities/Sheet";
import { type EnhancedCell } from "../entities/EnhancedCell";
import {
  calculateNumberEntropy,
  calculateSequenceEntropyScore,
} from "../utils/entropy";
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
    .map((name) => sheet.getColumnIndex(name))
    .filter(
      (index) => index !== -1 && sheet.numericColumnIndices.includes(index),
    );

  if (uniqueColumnIndices.length === 0) {
    return [];
  }

  const matrix = sheet.invertedEnhancedMatrix;

  const repeatedSequences: RepeatedColumnSequence[] = [];
  const positionsByValue = new Map<number, Position[]>();
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
        const positions = positionsByValue.get(cellValue) ?? [];
        const newPosition: Position = {
          column: columnIndex,
          startRow: rowIndex,
          cellId: cellData.cellId,
        };
        if (positions.length < 100) {
          for (const position of positions) {
            if (
              checkedPositionPairs.has(
                `${position.column}-${position.startRow}-${columnIndex}-${rowIndex}`,
              )
            ) {
              continue;
            }
            // If the values are on the same row, skip since this is often expected to be the case in legitimate data (only in inverted mode, since the same is not true for columns)
            if (position.startRow === rowIndex) {
              continue;
            }
            let length = 1;
            const repeatedValues: number[] = [cellValue];
            while (
              matrix[position.column][position.startRow + length]
                ?.isAnalyzable &&
              !(
                position.column === columnIndex &&
                rowIndex === position.startRow + length
              ) &&
              matrix[position.column][position.startRow + length].value ===
                matrix[columnIndex][rowIndex + length]?.value
            ) {
              repeatedValues.push(
                matrix[position.column][position.startRow + length]
                  .value as number,
              );
              checkedPositionPairs.add(
                `${position.column}-${position.startRow + length}-${columnIndex}-${rowIndex + length}`,
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
              position.column === newPosition.column &&
              position.startRow + length === newPosition.startRow
            ) {
              // Skip if the repeated sequences are back-to-back
              continue;
            }
            const repeatedSequence = new RepeatedColumnSequence({
              positions: [position, newPosition],
              values: repeatedValues,
              sheet,
            });
            if (repeatedSequence.matrixSizeAdjustedEntropyScore > 2) {
              repeatedSequences.push(repeatedSequence);
            }
          }
        }
        positions.push(newPosition);
        positionsByValue.set(cellValue, positions);
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
    .map((name) => sheet.getColumnIndex(name))
    .filter(
      (index) => index !== -1 && sheet.numericColumnIndices.includes(index),
    );

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
    .map(([value, cells]) => {
      const entropy = calculateNumberEntropy(value);
      return new DuplicateValue(value, entropy, sheet, cells);
    })
    .filter((duplicateValue) =>
      [SuspicionLevel.Low, SuspicionLevel.Medium, SuspicionLevel.High].includes(
        duplicateValue.suspicionLevel,
      ),
    )
    .toSorted((a, b) => b.entropyScore - a.entropyScore);

  return {
    duplicateValues,
  };
}

export { findDuplicateRows } from "../strategies/duplicateRows/findDuplicateRows";
