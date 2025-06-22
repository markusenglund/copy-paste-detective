import { RepeatedColumnSequencesResult } from "../../types/strategies";
import { RepeatedColumnSequence } from "../../entities/RepeatedColumnSequence";
import { levelToSymbol } from "../../utils/output";

function formatSequencesForDisplay(sequences: RepeatedColumnSequence[]): Array<{
  level: string;
  sheetName: string;
  values: string;
  length: number;
  entropy: string;
  sizeAdj: string;
  cell1: string;
  cell2: string;
  matrix: number;
  instances: number;
}> {
  return sequences.map((sequence) => {
    const firstCellID = sequence.positions[0].cellId;
    const secondCellId = sequence.positions[1].cellId;
    const table = {
      level: levelToSymbol[sequence.suspicionLevel],
      sheetName: sequence.sheetName,
      values:
        sequence.values.length > 1
          ? `${sequence.values[0]} -> ${sequence.values.at(-1)}`
          : `${sequence.values[0]}`,
      length: sequence.values.length,
      entropy: sequence.sequenceEntropyScore.toFixed(1),
      sizeAdj: sequence.matrixSizeAdjustedEntropyScore.toFixed(1),
      cell1: firstCellID,
      cell2: secondCellId,
      matrix: sequence.numberCount,
      instances: sequence.positions.length,
    };
    return table;
  });
}

export function printRepeatedColumnSequencesResults({
  sequences,
}: RepeatedColumnSequencesResult): void {
  console.log(`\nRepeated sequences:`);

  if (sequences.length === 0) {
    console.log("No repeated sequences were found.");
    return;
  }

  const humanReadableSequences = formatSequencesForDisplay(
    sequences.slice(0, 20),
  );
  console.table(humanReadableSequences);
}
