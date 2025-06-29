import { IndividualNumbersResult } from "../../types/strategies";
import { DuplicateValue } from "../../entities/DuplicateValue";
import { levelToSymbol } from "../../utils/output";

function formatDuplicatesForDisplay(duplicates: DuplicateValue[]): Array<{
  level: string;
  sheetName: string;
  value: number;
  n: number;
  entropy: number;
  entropyScore: number;
  matrix: number;
}> {
  return duplicates.map((duplicateValue) => {
    return {
      level: levelToSymbol[duplicateValue.suspicionLevel],
      sheetName: duplicateValue.sheet.name,
      value: duplicateValue.value,
      n: duplicateValue.numOccurences,
      entropy: duplicateValue.entropy,
      entropyScore: Math.round(duplicateValue.matrixSizeAdjustedEntropyScore),
      matrix: duplicateValue.sheet.numNumericCells,
    };
  });
}

export function printIndividualNumbersResults({
  duplicateValues,
}: IndividualNumbersResult): void {
  console.log(`\nSuspicious duplicate numbers:`);

  if (duplicateValues.length === 0) {
    console.log("No suspicious duplicate numbers found.");
    return;
  }

  const topDuplicates = duplicateValues.slice(0, 10);
  const humanReadableDuplicates = formatDuplicatesForDisplay(topDuplicates);

  console.table(humanReadableDuplicates);

  if (duplicateValues.length > 10) {
    console.log(
      `\nShowing top 10 of ${duplicateValues.length} suspicious duplicates.`,
    );
  }
}
