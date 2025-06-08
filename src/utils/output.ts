import {
  SuspicionLevel,
  type RepeatedSequence,
  type DuplicateValue
} from "src/types";

const levelToSymbol: Record<SuspicionLevel, string> = {
  [SuspicionLevel.None]: "",
  [SuspicionLevel.Low]: "❔",
  [SuspicionLevel.Medium]: "✅",
  [SuspicionLevel.High]: "🔴"
};

export function formatSequencesForDisplay(sequences: RepeatedSequence[]) {
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
) {
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
) {
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
