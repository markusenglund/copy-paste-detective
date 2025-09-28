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
import { EnhancedCell } from "../entities/EnhancedCell";
import { ExcelFileData } from "../types/ExcelFileData";
import { screenColumnsGemini } from "../ai/geminiService";

type CalculatedColumnProfile = {
  isRepeatingFraction: boolean;
  isSquareRoot: boolean;
  isLnArgument: boolean;
};

type AiColumnProfile = {
  isIncludedInAnalysis: boolean;
};

export type CategorizedColumn = Pick<Column, "index" | "name" | "id"> &
  CalculatedColumnProfile &
  AiColumnProfile;

// When AI is excluded, return a type without AiColumnProfile
export type CategorizedColumnBasic = Pick<Column, "index" | "name" | "id"> &
  CalculatedColumnProfile;

// Overloads
export function categorizeColumns(
  sheet: Sheet,
  excelFileData: ExcelFileData,
): Promise<CategorizedColumn[]>;
export function categorizeColumns(
  sheet: Sheet,
  excelFileData: ExcelFileData,
  options: { excludeAiProfile: false },
): Promise<CategorizedColumn[]>;
export function categorizeColumns(
  sheet: Sheet,
  excelFileData: ExcelFileData,
  options: { excludeAiProfile: true },
): Promise<CategorizedColumnBasic[]>;

// Implementation
export async function categorizeColumns(
  sheet: Sheet,
  excelFileData: ExcelFileData,
  options?: { excludeAiProfile: boolean },
): Promise<CategorizedColumn[] | CategorizedColumnBasic[]> {
  const calculatedColumnProfiles = getCalculatedColumnsProfiles(sheet);

  if (options?.excludeAiProfile) {
    const categorizedColumns = sheet.getColumns().map((column, index) => ({
      ...column,
      ...calculatedColumnProfiles[index],
    }));
    return categorizedColumns;
  }

  const aiColumnProfiles = await getAiColumnProfiles(sheet, excelFileData);

  const categorizedColumns = sheet.getColumns().map((column, index) => ({
    ...column,
    ...calculatedColumnProfiles[index],
    ...aiColumnProfiles[index],
  }));
  return categorizedColumns;
}

async function getAiColumnProfiles(
  sheet: Sheet,
  excelFileData: ExcelFileData,
): Promise<AiColumnProfile[]> {
  const columnNames = sheet.columnNames;
  const sampleData = sheet.enhancedMatrix
    .slice(sheet.firstDataRowIndex, sheet.firstDataRowIndex + 2)
    .map((row) => row.map((cell) => String(cell.value || "")));

  const screenColumnsResult = await screenColumnsGemini({
    paperName: excelFileData.articleName,
    excelFileName: excelFileData.excelFileName,
    readmeContent: excelFileData.dataDescription,
    columnNames,
    columnData: sampleData,
  });

  console.log(`[${sheet.name}] Unique columns:`, screenColumnsResult.unique);
  console.log(`[${sheet.name}] Shared columns:`, screenColumnsResult.shared);
  console.log(`[${sheet.name}] motivation:`, screenColumnsResult.motivation);

  const aiColumnProfile: AiColumnProfile[] = sheet
    .getColumns()
    .map((column) => ({
      isIncludedInAnalysis: screenColumnsResult.unique.includes(column.name),
    }));

  return aiColumnProfile;
}

export function getCalculatedColumnsProfiles(
  sheet: Sheet,
): CalculatedColumnProfile[] {
  const sampleSize = 10;
  const sampleData = sheet.enhancedMatrix.slice(
    sheet.firstDataRowIndex,
    sheet.firstDataRowIndex + sampleSize,
  );

  return sheet
    .getColumns()
    .map((column) => getCalculatedColumnProfile(column, sampleData));
}

function getCalculatedColumnProfile(
  column: Column,
  sampleData: EnhancedCell[][],
): CalculatedColumnProfile {
  const repeatingFractionMatches: RepeatingFractionMatch[] = [];
  const squareRootMatches: SquareRootMatch[] = [];
  const squareRootOfFractionMatches: SquareRootOfFractionMatch[] = [];
  const naturalLogarithmMatches: LogarithmMatch[] = [];
  for (let i = 0; i < sampleData.length; i++) {
    const cell = sampleData[i][column.index];
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
          `Natural logarithm: ${cell.cellId}  - ${value}=ln(${naturalLogarithmMatch.argument}) (${column.name})`,
        );
        naturalLogarithmMatches.push(naturalLogarithmMatch);
        continue;
      }
    }
  }
  const attributes: CalculatedColumnProfile = {
    isRepeatingFraction: repeatingFractionMatches.length > 0,
    isSquareRoot:
      squareRootMatches.length > 0 || squareRootOfFractionMatches.length > 0,
    isLnArgument: naturalLogarithmMatches.length > 0,
  };
  return attributes;
}
