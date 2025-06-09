import {
  SuspicionLevel,
  type RepeatedSequence,
  type DuplicateValue,
  type DuplicateRow
} from "src/types";

const levelToSymbol: Record<SuspicionLevel, string> = {
  [SuspicionLevel.None]: "",
  [SuspicionLevel.Low]: "❔",
  [SuspicionLevel.Medium]: "✅",
  [SuspicionLevel.High]: "🔴"
};

export function formatSequencesForDisplay(sequences: RepeatedSequence[]): Array<{
  level: string;
  sheetName: string;
  values: string;
  length: number;
  sizeAdjEntropy: string;
  adjEntropy: string;
  entropy: string;
  cell1: string;
  cell2: string;
  matrix: number;
  instances: number;
  axis: string;
}> {
  return sequences.map(sequence => {
    const firstCellID = sequence.positions[0].cellId;
    const secondCellId = sequence.positions[1].cellId;
    let level = SuspicionLevel.None;
    if (sequence.matrixSizeAdjustedEntropyScore > 10) {
      level = SuspicionLevel.High;
    } else if (sequence.matrixSizeAdjustedEntropyScore > 5) {
      level = SuspicionLevel.Medium;
    } else if (sequence.matrixSizeAdjustedEntropyScore > 4) {
      level = SuspicionLevel.Low;
    }
    const table = {
      level: levelToSymbol[level],
      sheetName: sequence.sheetName,
      values:
        sequence.values.length > 1
          ? `${sequence.values[0]} -> ${sequence.values.at(-1)}`
          : `${sequence.values[0]}`,
      length: sequence.values.length,
      sizeAdjEntropy: sequence.matrixSizeAdjustedEntropyScore.toFixed(1),
      adjEntropy: sequence.adjustedSequenceEntropyScore.toFixed(1),
      entropy: sequence.sequenceEntropyScore.toFixed(1),
      cell1: firstCellID,
      cell2: secondCellId,
      matrix: sequence.numberCount,
      instances: sequence.positions.length,
      axis: sequence.axis
    };
    return table;
  });
}

export function formatDuplicatesByEntropyForDisplay(
  duplicates: DuplicateValue[]
): Array<{
  level: string;
  sheetName: string;
  value: number;
  n: number;
  entropy: number;
  matrix: number;
}> {
  return duplicates
    .toSorted((a, b) => (b.entropy ?? 0) - (a.entropy ?? 0))
    .map(duplicateValue => {
      let level = SuspicionLevel.None;
      if (duplicateValue.entropy > 10_000_000) {
        level = SuspicionLevel.High;
      } else if (duplicateValue.entropy > 100_000) {
        level = SuspicionLevel.Medium;
      } else if (duplicateValue.entropy > 10_000) {
        level = SuspicionLevel.Low;
      }
      return {
        level: levelToSymbol[level],
        sheetName: duplicateValue.sheet.name,
        value: duplicateValue.value,
        n: duplicateValue.numOccurences,
        entropy: duplicateValue.entropy,
        matrix: duplicateValue.sheet.numNumericCells
      };
    });
}

export function formatDuplicatesByOccurrenceForDisplay(
  duplicates: DuplicateValue[]
): Array<{
  level: string;
  sheetName: string;
  value: number;
  n: number;
  entropy: number;
  matrix: number;
}> {
  return duplicates
    .toSorted((a, b) => (b.numOccurences ?? 0) - (a.numOccurences ?? 0))
    .map(obj => {
      let level = SuspicionLevel.None;
      if (obj.numOccurences > 100) {
        level = SuspicionLevel.High;
      } else if (obj.numOccurences > 20) {
        level = SuspicionLevel.Medium;
      } else if (obj.numOccurences > 5) {
        level = SuspicionLevel.Low;
      }
      return {
        level: levelToSymbol[level],
        sheetName: obj.sheet.name,
        value: obj.value,
        n: obj.numOccurences,
        entropy: obj.entropy,
        matrix: obj.sheet.numNumericCells
      };
    });
}

export function formatDuplicateRowsForDisplay(
  duplicateRows: DuplicateRow[]
): Array<{
  level: string;
  sheetName: string;
  row1: number;
  row2: number;
  sharedCount: number;
  sharedValues: string;
  sharedColumns: string;
  entropyScore: string;
}> {
  return duplicateRows.map(duplicateRow => {
    let level = SuspicionLevel.None;
    if (duplicateRow.rowEntropyScore > 50) {
      level = SuspicionLevel.High;
    } else if (duplicateRow.rowEntropyScore > 20) {
      level = SuspicionLevel.Medium;
    } else if (duplicateRow.rowEntropyScore > 5) {
      level = SuspicionLevel.Low;
    }

    // Format shared values for display (show first few if many)
    const sharedValuesDisplay = duplicateRow.sharedValues.length > 3
      ? `${duplicateRow.sharedValues.slice(0, 3).join(", ")}... (+${duplicateRow.sharedValues.length - 3} more)`
      : duplicateRow.sharedValues.join(", ");

    // Format shared columns with both names and letters
    const columnNames = duplicateRow.sheet.columnNames;
    const sharedColumnsDisplay = duplicateRow.sharedColumns.map(colIndex => {
      const columnName = columnNames[colIndex] || `Col${colIndex}`;
      const columnLetter = getColumnLetter(colIndex);
      return `${columnName}(${columnLetter})`;
    }).join(", ");

    return {
      level: levelToSymbol[level],
      sheetName: duplicateRow.sheet.name,
      row1: duplicateRow.rowIndices[0] + 1, // Convert to 1-based indexing for display
      row2: duplicateRow.rowIndices[1] + 1,
      sharedCount: duplicateRow.totalSharedCount,
      sharedValues: sharedValuesDisplay,
      sharedColumns: sharedColumnsDisplay,
      entropyScore: duplicateRow.rowEntropyScore.toFixed(1)
    };
  });
}

function getColumnLetter(columnIndex: number): string {
  let columnLetters = "";
  let dividend = columnIndex;
  do {
    const remainder = dividend % 26;
    columnLetters = String.fromCharCode(65 + remainder) + columnLetters;
    dividend = Math.floor(dividend / 26) - 1;
  } while (dividend >= 0);
  return columnLetters;
}
