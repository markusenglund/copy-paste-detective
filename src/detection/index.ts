import {
  type Position,
  type RepeatedSequence,
  type DuplicateValuesResult,
  type DuplicateRowsResult,
  type DuplicateRow,
  DuplicateValue
} from "src/types";
import { Sheet } from "src/entities/Sheet";
import { type EnhancedCell } from "src/entities/EnhancedCell";
import {
  calculateNumberEntropy,
  calculateEntropyScore,
  calculateSequenceEntropyScore,
  calculateRowEntropyScore
} from "src/utils/entropy";
import { type ColumnCategorization } from "src/ai/geminiService";
import { calculateSequenceRegularity } from "src/utils/sequence";

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
          cellId: isInverted
            ? getCellId(columnIndex, rowIndex)
            : getCellId(rowIndex, columnIndex)
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
            const { mostCommonIntervalSize, mostCommonIntervalSizePercentage } =
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
              sheetName,
              axis: isInverted ? "vertical" : "horizontal"
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
    .filter(([value, numOccurences]) => numOccurences > 1)
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

function compareRows(
  row1: EnhancedCell[],
  row2: EnhancedCell[],
  colIndices: number[],
  sheet: Sheet
): DuplicateRow {
  const sharedValues: number[] = [];
  const sharedColumns: number[] = [];

  for (const colIndex of colIndices) {
    const cell1 = row1[colIndex];
    const cell2 = row2[colIndex];
    const areCellsNumeric =
      cell1?.isNumeric && !cell1.isDate && cell2?.isNumeric && !cell2.isDate;
    if (areCellsNumeric) {
      if (cell1.value === cell2.value) {
        sharedValues.push(cell1.value as number);
        sharedColumns.push(colIndex);
      }
    }
  }
  const rowEntropyScore = calculateRowEntropyScore(
    sharedValues,
    colIndices.length
  );

  const totalSharedCount = sharedValues.length;
  const rowData: DuplicateRow = {
    rowIndices: [row1[0].row, row2[0].row],
    sharedValues,
    sharedColumns,
    totalSharedCount,
    sheet: sheet,
    rowEntropyScore
  };

  return rowData;
}

export function findDuplicateRows(
  sheet: Sheet,
  columnCategorization: ColumnCategorization
): DuplicateRowsResult {
  // Rows require at least one duplicate value with this much entropy to be considered duplicates.
  const minNumberEntropyScore = 200;
  // Rows require a rowEntropyScore of at least this much to be considered duplicates.
  const minRowEntropyScore = 0.1;
  const duplicateRows: DuplicateRow[] = [];

  // Get numeric columns that should be unique
  const uniqueColumnIndices = columnCategorization.unique
    .map(name => sheet.getColumnIndex(name))
    .filter(
      index => index !== -1 && sheet.numericColumnIndices.includes(index)
    );

  if (uniqueColumnIndices.length === 0) {
    return { duplicateRows: [] };
  }

  // Build value-to-rows indices for each numeric unique column
  const rowsByHighEntropyValueByColumn = new Map<
    number,
    Map<number, Set<number>>
  >();

  for (const colIndex of uniqueColumnIndices) {
    rowsByHighEntropyValueByColumn.set(colIndex, new Map());
  }

  // Populate the indices
  for (let rowIndex = 1; rowIndex < sheet.numRows; rowIndex++) {
    // Skip header row
    for (const colIndex of uniqueColumnIndices) {
      const cell = sheet.enhancedMatrix[rowIndex]?.[colIndex];
      if (cell?.isNumeric && !cell.isDate) {
        const value = cell.value as number;
        const entropy = calculateNumberEntropy(value);
        if (entropy < minNumberEntropyScore) {
          // Skip low entropy values to improve performance
          continue;
        }
        const columnMap = rowsByHighEntropyValueByColumn.get(colIndex)!;
        if (!columnMap.has(value)) {
          columnMap.set(value, new Set());
        }
        const rowSet = columnMap.get(value)!;
        rowSet.add(rowIndex);
      }
    }
  }

  // Compare rows with shared values and add them to duplicateRows
  const alreadyComparedRowPairs = new Set<string>();
  for (const [colIndex, valueMap] of rowsByHighEntropyValueByColumn) {
    for (const [value, rowSet] of valueMap) {
      if (rowSet.size > 1) {
        const rowArray = Array.from(rowSet);
        for (let i = 0; i < rowArray.length; i++) {
          for (let j = i + 1; j < rowArray.length; j++) {
            const row1Index = rowArray[i];
            const row2Index = rowArray[j];
            const pairKey = `${Math.min(row1Index, row2Index)}-${Math.max(
              row1Index,
              row2Index
            )}`;

            if (alreadyComparedRowPairs.has(pairKey)) {
              continue; // Skip already compared rows
            }

            const duplicateRow = compareRows(
              sheet.enhancedMatrix[row1Index],
              sheet.enhancedMatrix[row2Index],
              uniqueColumnIndices,
              sheet
            );
            alreadyComparedRowPairs.add(pairKey);
            if (duplicateRow.rowEntropyScore > minRowEntropyScore) {
              duplicateRows.push(duplicateRow);
            }
          }
        }
      }
    }
  }

  // Sort by entropy score (highest first) then by shared count
  duplicateRows.sort((a, b) => {
    if (b.rowEntropyScore !== a.rowEntropyScore) {
      return b.rowEntropyScore - a.rowEntropyScore;
    }
    return b.totalSharedCount - a.totalSharedCount;
  });

  return { duplicateRows };
}

function getCellId(columnIndex: number, rowIndex: number): string {
  let columnLetters = "";
  let dividend = columnIndex;
  do {
    const remainder = dividend % 26;
    columnLetters = String.fromCharCode(65 + remainder) + columnLetters;
    dividend = Math.floor(dividend / 26) - 1;
  } while (dividend >= 0);
  const rowNumber = rowIndex + 1;
  return `${columnLetters}${rowNumber}`;
}
