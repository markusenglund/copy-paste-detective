import { IndividualNumbersResult } from "src/types/strategies";
import { SuspicionLevel, type DuplicateValue } from "src/types";
import { levelToSymbol } from "src/utils/output";

function formatDuplicatesByEntropyForDisplay(
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

function formatDuplicatesByOccurrenceForDisplay(
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

export function printIndividualNumbersResults({
  topEntropyDuplicates,
  topOccurrenceHighEntropy
}: IndividualNumbersResult): void {
  const humanReadableTopEntropyDuplicateNumbers =
    formatDuplicatesByEntropyForDisplay(topEntropyDuplicates);
  const humanReadableTopOccurrenceNumbers =
    formatDuplicatesByOccurrenceForDisplay(topOccurrenceHighEntropy);

  console.log(`\nTop entropy duplicate numbers:`);
  console.table(humanReadableTopEntropyDuplicateNumbers);
  console.log(`Top occurrence numbers with entropy>5000:`);
  console.table(humanReadableTopOccurrenceNumbers);
}