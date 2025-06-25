import {
  findRepeatedSequences,
  deduplicateSortedSequences,
} from "../../detection";
import {
  RepeatedColumnSequencesResult,
  StrategyName,
  StrategyDependencies,
} from "../../types/strategies";
import { ExcelFileData } from "../../types/ExcelFileData";
import { RepeatedColumnSequence } from "../../entities/RepeatedColumnSequence";

export async function runRepeatedColumnSequencesStrategy(
  excelFileData: ExcelFileData,
  { categorizedColumnsBySheet }: StrategyDependencies,
): Promise<RepeatedColumnSequencesResult> {
  const startTime = performance.now();

  const repeatedColumnSequences: RepeatedColumnSequence[] = [];

  for (const sheet of excelFileData.sheets) {
    const categorizedColumns = categorizedColumnsBySheet.get(sheet.name);
    if (!categorizedColumns) {
      throw new Error(`Categorized columns not found for sheet: ${sheet.name}`);
    }
    const sheetRepeatedColumnSequences = findRepeatedSequences(
      sheet,
      categorizedColumns,
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
    .filter((sequence) => sequence.matrixSizeAdjustedEntropyScore > 1);

  const deduplicatedSortedSequences =
    deduplicateSortedSequences(sortedSequences);

  const executionTime = performance.now() - startTime;

  return {
    name: StrategyName.RepeatedColumnSequences,
    executionTime,
    sequences: deduplicatedSortedSequences,
  };
}
