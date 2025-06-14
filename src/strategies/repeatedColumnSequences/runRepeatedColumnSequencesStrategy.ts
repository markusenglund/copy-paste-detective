import { Sheet } from "../../entities/Sheet";
import {
  findRepeatedSequences,
  deduplicateSortedSequences
} from "../../detection";
import {
  StrategyContext,
  RepeatedColumnSequencesResult,
  StrategyName,
  StrategyDependencies
} from "../../types/strategies";
import { RepeatedSequence } from "../../types";

export async function runRepeatedColumnSequencesStrategy(
  sheets: Sheet[],
  _context: StrategyContext,
  _dependencies?: StrategyDependencies
): Promise<RepeatedColumnSequencesResult> {
  const startTime = performance.now();

  const repeatedColumnSequences: (RepeatedSequence & { sheetName: string })[] =
    [];

  for (const sheet of sheets) {
    const sheetRepeatedColumnSequences = findRepeatedSequences(
      sheet.invertedEnhancedMatrix,
      {
        sheetName: sheet.name,
        isInverted: true,
        numberCount: sheet.numNumericCells
      }
    );

    console.log(
      `[${sheet.name}] ${sheetRepeatedColumnSequences.length} column sequences found.`
    );

    repeatedColumnSequences.push(...sheetRepeatedColumnSequences);
  }

  const sortedSequences = repeatedColumnSequences
    .toSorted((a, b) => {
      return (
        (b.matrixSizeAdjustedEntropyScore || 0) -
        (a.matrixSizeAdjustedEntropyScore || 0)
      ); // Use || 0 to handle NaN values. TODO: Fix this in the findRepeatedSequences function
    })
    .filter(sequence => sequence.matrixSizeAdjustedEntropyScore > 1);

  const deduplicatedSortedSequences =
    deduplicateSortedSequences(sortedSequences);

  const executionTime = performance.now() - startTime;

  return {
    name: StrategyName.RepeatedColumnSequences,
    executionTime,
    sequences: deduplicatedSortedSequences
  };
}
