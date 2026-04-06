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
import { ExcelFileData, DryadExcelFileData } from "../types/ExcelFileData";
import { screenColumnsWithCache } from "../ai/useCases/screenColumns";
import { logger } from "../utils/logger";

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

// Implementation
export async function categorizeColumns(
  sheet: Sheet,
  excelFileData: ExcelFileData,
  options?: { excludeAiProfile: boolean; includedColumns?: string[] },
): Promise<CategorizedColumn[]> {
  const calculatedColumnProfiles = getCalculatedColumnsProfiles(sheet);

  // Skip AI column screening for PMC/standalone (no data description available)
  // and when explicitly excluded via options
  if (options?.excludeAiProfile || excelFileData.source !== "dryad") {
    if (options?.includedColumns) {
      const sheetColumnNames = sheet.getColumns().map((c) => c.name);
      const unmatchedColumns = options.includedColumns.filter(
        (name) => !sheetColumnNames.includes(name),
      );
      if (unmatchedColumns.length > 0) {
        logger.warn(
          `[${sheet.name}] --columns: the following names did not match any columns in this sheet: ${unmatchedColumns.join(", ")}`,
        );
      }
    }

    const categorizedColumns = sheet.getColumns().map((column, index) => ({
      ...column,
      ...calculatedColumnProfiles[index],
      isIncludedInAnalysis: options?.includedColumns
        ? options.includedColumns.includes(column.name)
        : true,
    }));
    return categorizedColumns;
  }

  // Dryad path: use AI to screen columns
  logger.info(
    `[${sheet.name}] Getting AI column profiles for ${sheet.getColumns().length} columns`,
  );

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
  excelFileData: DryadExcelFileData,
): Promise<AiColumnProfile[]> {
  const columnNames = sheet.columnNames;
  const sampleData = sheet.enhancedMatrix
    .slice(sheet.firstDataRowIndex, sheet.firstDataRowIndex + 2)
    .map((row) => row.map((cell) => String(cell.value || "")));

  const screenColumnsResult = await screenColumnsWithCache({
    paperName: excelFileData.articleName,
    excelFileName: excelFileData.excelFileName,
    readmeContent: excelFileData.dataDescription ?? "",
    columnNames,
    columnData: sampleData,
    sheetName: sheet.name,
    datasetId: excelFileData.datasetId,
    datasetFileId: excelFileData.datasetFileId,
    dryadDatasetId: excelFileData.dryadDatasetId,
    dryadExcelFileId: excelFileData.dryadExcelFileId,
  });

  logger.debug(
    `[${sheet.name}] Included columns: ${screenColumnsResult.includedColumnNames.join(", ")}`,
  );
  logger.debug(
    `[${sheet.name}] Excluded columns: ${screenColumnsResult.excludedColumnNames.join(", ")}`,
  );
  logger.debug(`[${sheet.name}] motivation: ${screenColumnsResult.motivation}`);

  const aiColumnProfile: AiColumnProfile[] = sheet
    .getColumns()
    .map((column) => ({
      isIncludedInAnalysis: !screenColumnsResult.excludedColumnNames.includes(
        column.name,
      ),
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
        // console.log(
        //   `Natural logarithm: ${cell.cellId}  - ${value}=ln(${naturalLogarithmMatch.argument}) (${column.name})`,
        // );
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
