import {
  maxAiReviewsPerDataset,
  maxExcelFilesPerDataset,
} from "../config/config";
import { reviewResults } from "../resultsReview/resultsReview";
import { ExcelFileData } from "../types/ExcelFileData";
import { StrategyName } from "../types/strategies";
import { analyzeExcelFile, ExcelFileAnalysis } from "./analyzeExcelFile";

export async function analyzeDataset(
  excelFiles: ExcelFileData[],
  strategies: StrategyName[],
): Promise<void> {
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

  const mostSuspiciousAnalyses = excelFileAnalyses
    .toSorted((a, b) => {
      // Check how we did it for the report
    })
    .slice(0, maxAiReviewsPerDataset);

  for (const analysis of mostSuspiciousAnalyses) {
    await reviewResults({
      excelFileData: selectedExcelFilesByFilename[analysis.excelFileName]!,
      categorizedColumnsBySheet: analysis.categorizedColumnsBySheet,
      duplicateRowsResult: analysis.results[StrategyName.DuplicateRows],
      repeatedColumnSequencesResult:
        analysis.results[StrategyName.RepeatedColumnSequences],
      duplicateValuesResultsBySheet: analysis.duplicateValuesResultsBySheet,
    });
  }
}
