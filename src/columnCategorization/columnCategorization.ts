import { Sheet } from "../entities/Sheet";
import { Column } from "../entities/Column";
import { detectRepeatingFraction } from "../utils/fraction";

type ColumnAttributes = {
  isRepeatingFraction: boolean;
  isSquareRoot: boolean;
};

type Response = {
  column: Column;
  attributes: ColumnAttributes;
}[];

export const categorizeColumns = (sheet: Sheet): Response => {
  const columns = sheet.getColumns();
  const sampleSize = 10;
  const sampleData = sheet.enhancedMatrix.slice(
    sheet.firstDataRowIndex,
    sheet.firstDataRowIndex + sampleSize,
  );

  const responses: Response = [];
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    let fractionCount = 0;

    for (let j = 0; j < sampleData.length; j++) {
      const cell = sampleData[j][i];
      if (cell.isAnalyzable) {
        const value = cell.value as number;
        const repeatingFraction = detectRepeatingFraction(value);
        if (repeatingFraction) {
          console.log(
            `Repeating fraction: ${cell.cellId}  - ${value}=${repeatingFraction.numerator}/${repeatingFraction.denominator} (${column.combinedColumnName})`,
          );
          fractionCount++;
        }
      }
    }

    const attributes: ColumnAttributes = {
      isRepeatingFraction: fractionCount > 0,
      isSquareRoot: false,
    };

    responses.push({ column, attributes });
  }
  return responses;
};
