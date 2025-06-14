import { Sheet } from "src/entities/Sheet";
import { findRepeatedSequences, deduplicateSortedSequences } from "src/detection";
import { Strategy, StrategyContext, RepeatedColumnSequencesResult, StrategyName } from "src/types/strategies";
import { RepeatedSequence } from "src/types";

export class RepeatedColumnSequencesStrategy implements Strategy {
  name = StrategyName.RepeatedColumnSequences;

  async execute(sheets: Sheet[], _context: StrategyContext): Promise<RepeatedColumnSequencesResult> {
    const startTime = performance.now();
    
    const repeatedSequences: (RepeatedSequence & { sheetName: string })[] = [];

    for (const sheet of sheets) {
      console.time("Vertical sequences");
      const verticalSequences = findRepeatedSequences(
        sheet.invertedEnhancedMatrix,
        {
          sheetName: sheet.name,
          isInverted: true,
          numberCount: sheet.numNumericCells
        }
      );
      console.timeEnd("Vertical sequences");
      
      console.time("Horizontal sequences");
      const horizontalSequences = findRepeatedSequences(sheet.enhancedMatrix, {
        sheetName: sheet.name,
        isInverted: false,
        numberCount: sheet.numNumericCells
      });
      console.timeEnd("Horizontal sequences");

      console.log(
        `[${sheet.name}] ${verticalSequences.length} vertical sequences found, ${horizontalSequences.length} horizontal sequences found`
      );

      repeatedSequences.push(...verticalSequences);
      repeatedSequences.push(...horizontalSequences);
    }

    const sortedSequences = repeatedSequences
      .toSorted((a, b) => {
        return (
          (b.matrixSizeAdjustedEntropyScore || 0) -
          (a.matrixSizeAdjustedEntropyScore || 0)
        ); // Use || 0 to handle NaN values. TODO: Fix this in the findRepeatedSequences function
      })
      .filter(sequence => sequence.matrixSizeAdjustedEntropyScore > 1);

    const deduplicatedSortedSequences = deduplicateSortedSequences(sortedSequences);

    const executionTime = performance.now() - startTime;

    return {
      name: StrategyName.RepeatedColumnSequences,
      executionTime,
      sequences: deduplicatedSortedSequences
    };
  }
}