import {
  maxAiReviewsPerDataset,
  maxExcelFilesPerDataset,
} from "../config/config";
import {
  reviewSheetResults,
  SheetReviewInput,
} from "../resultsReview/resultsReview";
import { ExcelFileData } from "../types/ExcelFileData";
import { StrategyName } from "../types/strategies";
import { analyzeExcelFile, ExcelFileAnalysis } from "./analyzeExcelFile";
import { DuplicateRow } from "../entities/DuplicateRow";
import { RepeatedColumnSequence } from "../entities/RepeatedColumnSequence";
import { Sheet } from "../entities/Sheet";
import { CategorizedColumn } from "../columnCategorization/columnCategorization";
import { DuplicateValuesResult } from "../types";

type SheetAnalysisData = {
  sheet: Sheet;
  excelFileData: ExcelFileData;
  categorizedColumns: CategorizedColumn[];
  duplicateRows: DuplicateRow[];
  duplicateColumnSequences: RepeatedColumnSequence[];
  duplicateValuesResult: DuplicateValuesResult;
  suspicionScore: number;
  suspicionRankWithinFile: number;
};

/**
 * Calculate a suspicion score for a sheet by summing the top 3 highest
 * matrixSizeAdjustedEntropyScore values from duplicate rows and column sequences.
 * This prevents sheets with only one suspicious block from dominating.
 */
function getSheetSuspicionScore(
  duplicateRows: DuplicateRow[],
  duplicateColumnSequences: RepeatedColumnSequence[],
): number {
  const allScores = [
    ...duplicateRows.map((r) => r.matrixSizeAdjustedEntropyScore),
    ...duplicateColumnSequences.map((s) => s.matrixSizeAdjustedEntropyScore),
  ].toSorted((a, b) => b - a);

  return allScores.slice(0, 3).reduce((sum, score) => sum + score, 0);
}

/**
 * Find the most suspicious sheets across all analyzed files and review them.
 * Sorts by suspicion rank within file first (to prevent one file from taking all slots),
 * then by overall suspicion score.
 */
async function reviewMostSuspiciousResults(
  excelFileAnalyses: ExcelFileAnalysis[],
  excelFilesByFilename: Record<string, ExcelFileData>,
): Promise<void> {
  const allSheetData: SheetAnalysisData[] = [];

  // Build sheet-level analysis data for all sheets
  for (const analysis of excelFileAnalyses) {
    const excelFileData = excelFilesByFilename[analysis.excelFileName];
    if (!excelFileData) {
      continue;
    }

    const sheetDataForFile: SheetAnalysisData[] = [];

    for (const sheet of excelFileData.sheets) {
      const categorizedColumns = analysis.categorizedColumnsBySheet.get(
        sheet.name,
      );
      const duplicateValuesResult = analysis.duplicateValuesResultsBySheet.get(
        sheet.name,
      );

      if (!categorizedColumns || !duplicateValuesResult) {
        continue;
      }

      // Get sheet-level duplicate rows
      const duplicateRows =
        analysis.results[StrategyName.DuplicateRows]?.duplicateRows.filter(
          (r) => r.sheet.name === sheet.name,
        ) ?? [];

      // Get sheet-level duplicate column sequences
      const duplicateColumnSequences =
        analysis.results[
          StrategyName.RepeatedColumnSequences
        ]?.sequences.filter((s) => s.sheetName === sheet.name) ?? [];

      const suspicionScore = getSheetSuspicionScore(
        duplicateRows,
        duplicateColumnSequences,
      );

      sheetDataForFile.push({
        sheet,
        excelFileData,
        categorizedColumns,
        duplicateRows,
        duplicateColumnSequences,
        duplicateValuesResult,
        suspicionScore,
        suspicionRankWithinFile: 0, // Will be set below
      });
    }

    // Rank sheets within this file by suspicion score (highest first)
    sheetDataForFile
      .toSorted((a, b) => b.suspicionScore - a.suspicionScore)
      .forEach((data, index) => {
        data.suspicionRankWithinFile = index + 1;
      });

    allSheetData.push(...sheetDataForFile);
  }

  // Sort all sheets: first by rank within file (ascending), then by suspicion score (descending)
  // This ensures we pick the most suspicious sheet from each file before picking second-most suspicious
  const sortedSheets = allSheetData
    .filter((data) => data.suspicionScore > 0) // Only review sheets with findings
    .toSorted((a, b) => {
      if (a.suspicionRankWithinFile !== b.suspicionRankWithinFile) {
        return a.suspicionRankWithinFile - b.suspicionRankWithinFile;
      }
      return b.suspicionScore - a.suspicionScore;
    });

  // Take top N sheets and review them
  const sheetsToReview = sortedSheets.slice(0, maxAiReviewsPerDataset);

  console.log(
    `Reviewing ${sheetsToReview.length} sheets: ${sheetsToReview
      .map((s) => {
        return `'${s.sheet.name}' from file '${s.excelFileData.excelFileName}' (suspicion score: ${s.suspicionScore.toFixed(2)})`;
      })
      .join("\n")}`,
  );

  for (const sheetData of sheetsToReview) {
    const reviewInput: SheetReviewInput = {
      sheet: sheetData.sheet,
      excelFileData: sheetData.excelFileData,
      categorizedColumns: sheetData.categorizedColumns,
      duplicateRows: sheetData.duplicateRows,
      duplicateColumnSequences: sheetData.duplicateColumnSequences,
      numOccurrencesByNumericValue:
        sheetData.duplicateValuesResult.numOccurrencesByNumericValue,
    };

    await reviewSheetResults(reviewInput);
  }
}

export async function analyzeDataset(
  excelFiles: ExcelFileData[],
  strategies: StrategyName[],
): Promise<ExcelFileAnalysis[]> {
  const selectedExcelFilesByFilename = Object.fromEntries(
    excelFiles
      .slice(0, maxExcelFilesPerDataset)
      .map((file) => [file.excelFileName, file]),
  );

  const excelFileAnalyses: ExcelFileAnalysis[] = [];
  for (const excelFile of Object.values(selectedExcelFilesByFilename)) {
    const excelFileAnalysis = await analyzeExcelFile(strategies, excelFile);
    excelFileAnalyses.push(excelFileAnalysis);
  }

  await reviewMostSuspiciousResults(
    excelFileAnalyses,
    selectedExcelFilesByFilename,
  );

  return excelFileAnalyses;
}
