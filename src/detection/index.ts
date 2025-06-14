import {
  type Position,
  type RepeatedSequence,
  type DuplicateValuesResult,
  DuplicateValue
} from "../types";
import { Sheet } from "../entities/Sheet";
import { type EnhancedCell } from "../entities/EnhancedCell";
import {
  calculateNumberEntropy,
  calculateEntropyScore,
  calculateSequenceEntropyScore
} from "../utils/entropy";
import { calculateSequenceRegularity } from "../utils/sequence";

export function deduplicateSortedSequences(
  repeatedSequences: RepeatedSequence[]
): RepeatedSequence[] {
  let previousSequence: RepeatedSequence | null = null;
  const deduplicatedSortedSequences: RepeatedSequence[] = [];
  for (const sequence of repeatedSequences) {
    if (previousSequence) {
      const isSameSequence =
        previousSequence.adjustedSequenceEntropyScore ===
          sequence.adjustedSequenceEntropyScore &&
        previousSequence.values.every((value, index) => {
          return value === sequence.values[index];
        });
      if (isSameSequence) {
        sequence.positions.forEach(position => {
          // Check if position already exists in previousSequence and if not, add it
          const exists = previousSequence?.positions.find(
            p => p.cellId === position.cellId
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
  matrix: EnhancedCell[][],
  {
    isInverted,
    sheetName,
    numberCount
  }: { isInverted: boolean; sheetName: string; numberCount: number }
): RepeatedSequence[] {
  const numberCountEntropyScore = calculateEntropyScore(
    Math.max(numberCount, 500) // Prevent very small excel files from getting too high of an entropy score
  );

  const repeatedSequences: RepeatedSequence[] = [];
  const positionsByValue = new Map<number, Position[]>();
  const checkedPositionPairs = new Set<string>();
  for (let columnIndex = 0; columnIndex < matrix.length; columnIndex++) {
    for (let rowIndex = 0; rowIndex < matrix[columnIndex].length; rowIndex++) {
      if (repeatedSequences.length > 1000) {
        // Limit the number of sequences to avoid memory issues
        break;
      }
      const cellData = matrix[columnIndex]?.[rowIndex];
      if (cellData?.isNumeric && !cellData.isDate) {
        const cellValue = cellData.value as number;
        const positions = positionsByValue.get(cellValue) ?? [];
        const newPosition: Position = {
          column: columnIndex,
          startRow: rowIndex,
          cellId: cellData.cellId
        };
        if (positions.length < 100) {
          for (const position of positions) {
            if (
              checkedPositionPairs.has(
                `${position.column}-${position.startRow}-${columnIndex}-${rowIndex}`
              )
            ) {
              continue;
            }
            // If the values are on the same row, skip since this is often expected to be the case in legitimate data (only in inverted mode, since the same is not true for columns)
            if (position.startRow === rowIndex && isInverted) {
              continue;
            }
            let length = 1;
            const repeatedValues: number[] = [cellValue];
            while (
              matrix[position.column][position.startRow + length]?.isNumeric &&
              !matrix[position.column][position.startRow + length]?.isDate &&
              !(
                position.column === columnIndex &&
                rowIndex === position.startRow + length
              ) &&
              matrix[position.column][position.startRow + length].value ===
                matrix[columnIndex][rowIndex + length]?.value
            ) {
              repeatedValues.push(
                matrix[position.column][position.startRow + length]
                  .value as number
              );
              checkedPositionPairs.add(
                `${position.column}-${position.startRow + length}-${columnIndex}-${rowIndex + length}`
              );
              length++;
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
            const { mostCommonIntervalSizePercentage } =
              calculateSequenceRegularity(repeatedValues);
            const intervalAdjustedSequenceEntropyScore =
              sequenceEntropyScore * (1 - mostCommonIntervalSizePercentage);
            const matrixSizeAdjustedEntropyScore =
              intervalAdjustedSequenceEntropyScore / numberCountEntropyScore;
            const repeatedSequence: RepeatedSequence = {
              positions: [position, newPosition],
              values: repeatedValues,
              sequenceEntropyScore,
              adjustedSequenceEntropyScore:
                intervalAdjustedSequenceEntropyScore,
              matrixSizeAdjustedEntropyScore,
              numberCount,
              sheetName
            };
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

export function findDuplicateValues(sheet: Sheet): DuplicateValuesResult {
  const numOccurencesByNumericCellValue = new Map<number, number>();
  sheet.enhancedMatrix.forEach(row => {
    row.forEach(cell => {
      if (cell.isNumeric && !cell.isDate) {
        const value = cell.value as number;
        const numOccurences = numOccurencesByNumericCellValue.get(value) ?? 0;
        numOccurencesByNumericCellValue.set(value, numOccurences + 1);
      }
    });
  });

  const duplicateValuesSortedByEntropy: DuplicateValue[] = [
    ...numOccurencesByNumericCellValue.entries()
  ]
    .filter(([_value, numOccurences]) => numOccurences > 1)
    .map(([value, numOccurences]) => {
      const entropy = calculateNumberEntropy(value);
      return { value, numOccurences, entropy, sheet };
    })
    .toSorted((a, b) => b.entropy - a.entropy);

  const entropyThreshold = 5000;
  const duplicatedValuesAboveThresholdSortedByOccurences =
    duplicateValuesSortedByEntropy
      .filter(({ entropy }) => entropy > entropyThreshold)
      .toSorted((a, b) => b.numOccurences - a.numOccurences);

  return {
    duplicateValuesSortedByEntropy,
    duplicatedValuesAboveThresholdSortedByOccurences
  };
}

export { findDuplicateRows } from "../strategies/duplicateRows/findDuplicateRows";
