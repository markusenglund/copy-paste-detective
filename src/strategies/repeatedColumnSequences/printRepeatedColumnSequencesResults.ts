import { RepeatedColumnSequencesResult } from "src/types/strategies";
import { SuspicionLevel, type RepeatedSequence } from "src/types";
import { levelToSymbol } from "src/utils/output";

function formatSequencesForDisplay(
  sequences: RepeatedSequence[]
): Array<{
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

export function printRepeatedColumnSequencesResults({
  sequences
}: RepeatedColumnSequencesResult): void {
  const humanReadableSequences = formatSequencesForDisplay(
    sequences.slice(0, 20)
  );
  console.log(`\nRepeated sequences:`);
  console.table(humanReadableSequences);
}