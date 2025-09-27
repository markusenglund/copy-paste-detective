import { Sheet } from "../entities/Sheet";
import { Column } from "../entities/Column";
import {
  detectRepeatingFraction,
  RepeatingFractionMatch,
} from "../utils/fraction";
import {
  detectSquareRoot,
  SquareRootMatch,
  detectSquareRootOfFraction,
  SquareRootOfFractionMatch,
} from "../utils/squareRoot";
import { detectNaturalLogarithm, LogarithmMatch } from "../utils/logarithm";

type ColumnAttributes = {
  isRepeatingFraction: boolean;
  isSquareRoot: boolean;
  isLnArgument: boolean;
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
    const repeatingFractionMatches: RepeatingFractionMatch[] = [];
    const squareRootMatches: SquareRootMatch[] = [];
    const squareRootOfFractionMatches: SquareRootOfFractionMatch[] = [];
    const naturalLogarithmMatches: LogarithmMatch[] = [];
    for (let j = 0; j < sampleData.length; j++) {
      const cell = sampleData[j][i];
      if (cell.isAnalyzable) {
        const value = cell.value as number;
        const repeatingFractionMatch = detectRepeatingFraction(value);
        if (repeatingFractionMatch) {
          // console.log(
          //   `Repeating fraction: ${cell.cellId}  - ${value}=${repeatingFractionMatch.numerator}/${repeatingFractionMatch.denominator} (${column.combinedColumnName})`,
          // );
          repeatingFractionMatches.push(repeatingFractionMatch);
          continue;
        }
        const squareRootMatch = detectSquareRoot(value);
        if (squareRootMatch) {
          // console.log(
          //   `Square root: ${cell.cellId}  - ${value}=√${squareRootMatch.radicand} (${column.combinedColumnName})`,
          // );
          squareRootMatches.push(squareRootMatch);
          continue;
        }
        const squareRootOfFractionMatch = detectSquareRootOfFraction(value);
        if (squareRootOfFractionMatch) {
          // console.log(
          //   `Square root of fraction: ${cell.cellId}  - ${value}=√(${squareRootOfFractionMatch.numerator}/${squareRootOfFractionMatch.denominator}) (${column.combinedColumnName})`,
          // );
          squareRootOfFractionMatches.push(squareRootOfFractionMatch);
          continue;
        }

        const naturalLogarithmMatch = detectNaturalLogarithm(value);
        if (naturalLogarithmMatch) {
          console.log(
            `Natural logarithm: ${cell.cellId}  - ${value}=ln(${naturalLogarithmMatch.argument}) (${column.combinedColumnName})`,
          );
          naturalLogarithmMatches.push(naturalLogarithmMatch);
          continue;
        }
      }
    }
    const attributes: ColumnAttributes = {
      isRepeatingFraction: repeatingFractionMatches.length > 0,
      isSquareRoot:
        squareRootMatches.length > 0 || squareRootOfFractionMatches.length > 0,
      isLnArgument: naturalLogarithmMatches.length > 0,
    };

    responses.push({ column, attributes });
  }
  return responses;
};
