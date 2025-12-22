import { RepeatedColumnSequencesResult } from "../../types/strategies";
import { RepeatedColumnSequence } from "../../entities/RepeatedColumnSequence";
import { levelToSymbol } from "../../utils/output";

function formatSequencesForDisplay(
  repeatedSequences: RepeatedColumnSequence[],
): Array<{
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
  return repeatedSequences.map((repeatedSequence) => {
    const firstCellId = repeatedSequence.sequences[0].startCellId;
    const secondCellId = repeatedSequence.sequences[1].startCellId;
    const table = {
      level: levelToSymbol[repeatedSequence.suspicionLevel],
      sheetName: repeatedSequence.sheetName,
      values:
        repeatedSequence.values.length > 1
          ? `${repeatedSequence.values[0]} -> ${repeatedSequence.values.at(-1)}`
          : `${repeatedSequence.values[0]}`,
      length: repeatedSequence.values.length,
      entropy: repeatedSequence.sequenceEntropyScore.toFixed(1),
      sizeAdj: repeatedSequence.matrixSizeAdjustedEntropyScore.toFixed(1),
      cell1: firstCellId,
      cell2: secondCellId,
      matrix: repeatedSequence.numberCount,
      instances: repeatedSequence.sequences.length,
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
