import {
  DuplicateRowsResult,
  IndividualNumbersResult,
  RepeatedColumnSequencesResult,
  StrategyName,
} from "../types/strategies";
import individualNumbersStrategy from "../strategies/individualNumbers/individualNumbers";
import repeatedColumnSequencesStrategy from "../strategies/repeatedColumnSequences/repeatedColumnSequences";
import duplicateRowsStrategy from "../strategies/duplicateRows/duplicateRows";
import { ExcelFileData } from "../types/ExcelFileData";
import {
  categorizeColumns,
  CategorizedColumn,
} from "../columnCategorization/columnCategorization";
import { findDuplicateValues } from "./findDuplicateValues";
import { DuplicateValuesResult, SuspicionLevel } from "../types";
import { logger } from "../utils/logger";
import { generateHighlightedExcel } from "../strategies/repeatedColumnSequences/generateHighlightedExcel";
import { generateHighlightedExcelForDuplicateRows } from "../strategies/duplicateRows/generateHighlightedExcelForDuplicateRows";

export type ExcelFileAnalysisResults = {
  [StrategyName.IndividualNumbers]?: IndividualNumbersResult;
  [StrategyName.RepeatedColumnSequences]?: RepeatedColumnSequencesResult;
  [StrategyName.DuplicateRows]?: DuplicateRowsResult;
};

export type ExcelFileAnalysis = {
  excelFileName: string;
  categorizedColumnsBySheet: Map<string, CategorizedColumn[]>;
  duplicateValuesResultsBySheet: Map<string, DuplicateValuesResult>;
  results: ExcelFileAnalysisResults;
};

export async function analyzeExcelFile(
  strategies: StrategyName[],
  excelFileData: ExcelFileData,
  options?: { excludeAiProfile?: boolean },
): Promise<ExcelFileAnalysis> {
  logger.info(`🔍 Running strategies: ${strategies.join(", ")}`);
  const { sheets } = excelFileData;
  logger.info(
    `Found ${sheets.length} sheet(s): ${sheets.map((s) => s.name).join(", ")}`,
  );

  const results: ExcelFileAnalysisResults = {};
  const categorizedColumnsBySheet = new Map<string, CategorizedColumn[]>();
  const duplicateValuesResultsBySheet = new Map<
    string,
    DuplicateValuesResult
  >();
  await Promise.all(
    sheets.map(async (sheet) => {
      const categorizedColumns = await categorizeColumns(sheet, excelFileData, {
        excludeAiProfile: options?.excludeAiProfile ?? false,
      });

      categorizedColumnsBySheet.set(sheet.name, categorizedColumns);
      const duplicateValuesResults = findDuplicateValues(
        sheet,
        categorizedColumns,
      );
      duplicateValuesResultsBySheet.set(sheet.name, duplicateValuesResults);
    }),
  );

  let duplicateRowsResult: DuplicateRowsResult | undefined;

  // 1. Run duplicateRows first if requested
  if (strategies.includes(StrategyName.DuplicateRows)) {
    logger.info(`\n🔍 Running ${StrategyName.DuplicateRows} strategy...`);
    duplicateRowsResult = await duplicateRowsStrategy.execute(excelFileData, {
      categorizedColumnsBySheet,
      duplicateValuesResultsBySheet,
    });
    logger.info(
      `✅ ${StrategyName.DuplicateRows} completed in ${duplicateRowsResult.executionTime.toFixed(2)}ms`,
    );
    duplicateRowsStrategy.printResults(duplicateRowsResult);
    results[StrategyName.DuplicateRows] = duplicateRowsResult;

    // Generate highlighted Excel file if duplicate rows were found
    if (
      duplicateRowsResult.duplicateRows.length > 0 &&
      excelFileData.excelFilePath
    ) {
      const suspiciousDuplicateRows = duplicateRowsResult.duplicateRows.filter(
        (row) => row.suspicionLevel !== SuspicionLevel.None,
      );
      if (suspiciousDuplicateRows.length > 0) {
        await generateHighlightedExcelForDuplicateRows(
          excelFileData,
          excelFileData.excelFilePath,
          suspiciousDuplicateRows,
        );
      }
    }
  }

  // 2. Run repeatedColumnSequences second if requested
  if (strategies.includes(StrategyName.RepeatedColumnSequences)) {
    logger.info(
      `\n🔍 Running ${StrategyName.RepeatedColumnSequences} strategy...`,
    );
    const result = await repeatedColumnSequencesStrategy.execute(
      excelFileData,
      { categorizedColumnsBySheet, duplicateValuesResultsBySheet },
    );
    logger.info(
      `✅ ${StrategyName.RepeatedColumnSequences} completed in ${result.executionTime.toFixed(2)}ms`,
    );
    repeatedColumnSequencesStrategy.printResults(result);
    results[StrategyName.RepeatedColumnSequences] = result;

    // Generate highlighted Excel file if sequences were found and file path is available
    if (result.sequences.length > 0 && excelFileData.excelFilePath) {
      // Filter to only include sequences with at least Low suspicion level
      const suspiciousSequences = result.sequences.filter(
        (seq) => seq.suspicionLevel !== SuspicionLevel.None,
      );
      if (suspiciousSequences.length > 0) {
        await generateHighlightedExcel(
          excelFileData,
          excelFileData.excelFilePath,
          suspiciousSequences,
        );
      }
    }
  }

  // 3. Run individualNumbers last if requested, with duplicate rows results
  if (strategies.includes(StrategyName.IndividualNumbers)) {
    logger.info(`\n🔍 Running ${StrategyName.IndividualNumbers} strategy...`);
    const individualNumbersDependencies = {
      categorizedColumnsBySheet,
      previousResults: duplicateRowsResult ? [duplicateRowsResult] : [],
      duplicateValuesResultsBySheet,
    };
    const result = await individualNumbersStrategy.execute(
      excelFileData,
      individualNumbersDependencies,
    );
    logger.info(
      `✅ ${StrategyName.IndividualNumbers} completed in ${result.executionTime.toFixed(2)}ms`,
    );
    individualNumbersStrategy.printResults(result);
    results[StrategyName.IndividualNumbers] = result;
  }

  return {
    excelFileName: excelFileData.excelFileName,
    categorizedColumnsBySheet,
    duplicateValuesResultsBySheet,
    results,
  };
}
