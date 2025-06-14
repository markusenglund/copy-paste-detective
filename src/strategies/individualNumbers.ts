import { Sheet } from "src/entities/Sheet";
import { findDuplicateValues } from "src/detection";
import { Strategy, StrategyContext, IndividualNumbersResult, StrategyName } from "src/types/strategies";
import { DuplicateValue } from "src/types";

export class IndividualNumbersStrategy implements Strategy {
  name = StrategyName.IndividualNumbers;

  async execute(sheets: Sheet[], _context: StrategyContext): Promise<IndividualNumbersResult> {
    const startTime = performance.now();
    
    const topEntropyDuplicateNumbers: DuplicateValue[] = [];
    const topOccurrenceHighEntropyDuplicateNumbers: DuplicateValue[] = [];

    for (const sheet of sheets) {
      console.log(
        `[${sheet.name}] Found ${sheet.numNumericCells} numeric values`
      );

      const {
        duplicateValuesSortedByEntropy,
        duplicatedValuesAboveThresholdSortedByOccurences
      } = findDuplicateValues(sheet);

      topEntropyDuplicateNumbers.push(
        ...duplicateValuesSortedByEntropy.slice(0, 5)
      );

      topOccurrenceHighEntropyDuplicateNumbers.push(
        ...duplicatedValuesAboveThresholdSortedByOccurences.slice(0, 5)
      );
    }

    const executionTime = performance.now() - startTime;

    return {
      name: StrategyName.IndividualNumbers,
      executionTime,
      topEntropyDuplicates: topEntropyDuplicateNumbers,
      topOccurrenceHighEntropy: topOccurrenceHighEntropyDuplicateNumbers
    };
  }
}