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
import { DuplicateValuesResult, SuspicionLevel } from "../types";
import { logger } from "../utils/logger";

export type AnalyzeDatasetResult = {
  analyses: ExcelFileAnalysis[];
  wasFlaggedForReview: boolean;
  aiReviewCompleted: boolean;
};

type ReviewResult = {
  sheetsQualifiedForReview: number;
  sheetsReviewed: number;
};

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
 * Check if a sheet has any Medium or High suspicion level findings.
 * This determines if a sheet qualifies for AI review.
 */
function hasMediumOrHighFindings(
  duplicateRows: DuplicateRow[],
  duplicateColumnSequences: RepeatedColumnSequence[],
): boolean {
  const hasMediumHighRows = duplicateRows.some((row) =>
    [SuspicionLevel.Medium, SuspicionLevel.High].includes(row.suspicionLevel),
  );
  const hasMediumHighSequences = duplicateColumnSequences.some((seq) =>
    [SuspicionLevel.Medium, SuspicionLevel.High].includes(seq.suspicionLevel),
  );
  return hasMediumHighRows || hasMediumHighSequences;
}

/**
 * Find the most suspicious sheets across all analyzed files and review them.
 * Sorts by suspicion rank within file first (to prevent one file from taking all slots),
 * then by overall suspicion score.
 *
 * Returns information about how many sheets qualified for review and how many were reviewed.
 */
async function reviewMostSuspiciousResults(
  excelFileAnalyses: ExcelFileAnalysis[],
  excelFilesByFilename: Record<string, ExcelFileData>,
): Promise<ReviewResult> {
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

  // Count sheets that qualify for AI review (have Medium/High findings)
  const sheetsQualifiedForReview = sortedSheets.filter((data) =>
    hasMediumOrHighFindings(data.duplicateRows, data.duplicateColumnSequences),
  ).length;

  // Take top N sheets and review them
  const sheetsToReview = sortedSheets
    .filter((data) =>
      hasMediumOrHighFindings(
        data.duplicateRows,
        data.duplicateColumnSequences,
      ),
    )
    .slice(0, maxAiReviewsPerDataset);

  logger.info(
    `Reviewing ${sheetsToReview.length} sheets: ${sheetsToReview
      .map((s) => {
        return `'${s.sheet.name}' from file '${s.excelFileData.excelFileName}' (suspicion score: ${s.suspicionScore.toFixed(2)})`;
      })
      .join("\n")}`,
  );

  let sheetsReviewed = 0;
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

    const result = await reviewSheetResults(reviewInput);
    if (result !== null) {
      sheetsReviewed++;
    }
  }

  return {
    sheetsQualifiedForReview,
    sheetsReviewed,
  };
}

export async function analyzeDataset(
  excelFiles: ExcelFileData[],
  strategies: StrategyName[],
): Promise<AnalyzeDatasetResult> {
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

  const reviewResult = await reviewMostSuspiciousResults(
    excelFileAnalyses,
    selectedExcelFilesByFilename,
  );

  // Calculate how many sheets we attempted to review (limited by maxAiReviewsPerDataset)
  const sheetsAttempted = Math.min(
    reviewResult.sheetsQualifiedForReview,
    maxAiReviewsPerDataset,
  );

  return {
    analyses: excelFileAnalyses,
    wasFlaggedForReview: reviewResult.sheetsQualifiedForReview > 0,
    // AI review is complete if all attempted reviews succeeded
    aiReviewCompleted:
      sheetsAttempted > 0 && reviewResult.sheetsReviewed === sheetsAttempted,
  };
}
