import { Sheet } from "../../entities/Sheet";
import { findDuplicateValues } from "../../detection";
import {
  StrategyContext,
  IndividualNumbersResult,
  StrategyName
} from "../../types/strategies";
import { DuplicateValue } from "../../types";

export async function runIndividualNumbersStrategy(
  sheets: Sheet[],
  _context: StrategyContext
): Promise<IndividualNumbersResult> {
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