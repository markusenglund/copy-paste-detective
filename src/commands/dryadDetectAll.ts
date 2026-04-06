import { Command } from "@commander-js/extra-typings";
import pMap from "p-map";
import Mutex from "p-mutex";
import {
  getDownloadedNotAnalyzedDryadDatasetsWithFiles,
  getDryadDatasetByExtId,
  updateDryadDatasetAnalysisStatus,
  updateDryadDatasetIsMetaAnalysis,
  resetDryadAnalysisStatusesExceptFailed,
  type DryadDatasetWithFiles,
} from "../repositories/datasets/unifiedDatasetsRepository";
import { classifyMetaAnalysisWithCache } from "../ai/useCases/classifyMetaAnalysis";
import { db as analysisResultsDb } from "../dryad/analysisResultsDb";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { StrategyName } from "../types/strategies";
import { analyzeDataset } from "../detection/analyzeDataset";
import { AnalysisResults } from "../dryad/analysisResultsDb";
import { parseIntArgument, parseExtIds } from "../utils/command";
import {
  getJournalsByIssnMap,
  formatIssn,
} from "../repositories/journals/journalsRepository";
import { maxExcelFilesPerDataset } from "../config/config";
import { ExcelFileData } from "../types/ExcelFileData";
import { logger } from "../utils/logger";
import { closeDb } from "../db";
import { readTextFile } from "../utils/readTextFile";
import { storagePaths } from "../utils/paths/storagePaths";
import path from "path";

const metaAnalysisPattern = /meta[- ]?analysis|systematic review/i;

function getDataDescription(
  dataset: DryadDatasetWithFiles,
): string | undefined {
  const readmeFile = dataset.dataFiles.find((f) => f.fileType === "readme");
  if (readmeFile) {
    const datasetFolder = storagePaths.dryadDataset(
      dataset.dryadDetails.extIdNumeric,
    );
    const readmePath = path.join(datasetFolder, readmeFile.filename);
    try {
      return readTextFile(readmePath);
    } catch {
      // Fall through to usageNotes
    }
  }
  return dataset.dryadDetails.usageNotes ?? undefined;
}

async function checkIsMetaAnalysis(
  dataset: DryadDatasetWithFiles,
): Promise<boolean> {
  // Short circuit for obvious cases based on title
  if (metaAnalysisPattern.test(dataset.title)) {
    return true;
  }

  // If there's no abstract, we can't reliably classify - assume not a meta-analysis
  if (!dataset.abstract) {
    return false;
  }

  const dataDescription = getDataDescription(dataset);
  const result = await classifyMetaAnalysisWithCache({
    title: dataset.title,
    abstract: dataset.abstract!,
    dataDescription,
    datasetId: dataset.id,
  });

  return result.isMetaAnalysis;
}

const program = new Command();

program
  .name("dryad-detect-all")
  .description("Analyze excel files from downloaded Dryad datasets.")
  .version("0.1.0")
  .argument("[count]", "Number of datasets to analyze", parseIntArgument, 100)
  .option(
    "--reset",
    "Reset all non-failed analysis statuses to 'not_analyzed' before processing",
  )
  .option(
    "--extId <extIds>",
    "Analyze specific datasets by Dryad extId (comma-separated)",
    parseExtIds,
  )
  .action(async (count, options) => {
    // Handle --reset option
    if (options.reset) {
      logger.info(
        "Reset option detected - resetting all non-failed analysis statuses to 'not_analyzed'...",
      );
      const resetCount = await resetDryadAnalysisStatusesExceptFailed();
      logger.info(
        `Reset ${resetCount} dataset(s) from completed analysis states back to 'not_analyzed'`,
      );
    }

    const journalByIssn = await getJournalsByIssnMap();

    let downloadedDatasets: DryadDatasetWithFiles[];

    if (options.extId) {
      const datasets: DryadDatasetWithFiles[] = [];
      for (const extId of options.extId) {
        const dataset = await getDryadDatasetByExtId(extId);
        if (!dataset) {
          logger.error(`Dataset with extId ${extId} not found.`);
          process.exit(1);
        }
        datasets.push(dataset);
      }
      downloadedDatasets = datasets;
    } else {
      // Get datasets that have been downloaded but not yet analyzed
      downloadedDatasets = (
        await getDownloadedNotAnalyzedDryadDatasetsWithFiles()
      ).toSorted((a, b) => {
        return (
          new Date(b.publicationDate).getTime() -
          new Date(a.publicationDate).getTime()
        );
      });
    }

    const numDatasetsToAnalyze = options.extId
      ? downloadedDatasets.length
      : Math.min(count, downloadedDatasets.length);

    logger.info(
      `Analyzing ${numDatasetsToAnalyze} of ${downloadedDatasets.length} datasets.`,
    );

    // For each dataset, log the journal name, journal score and title
    for (const dataset of downloadedDatasets.slice(0, numDatasetsToAnalyze)) {
      const numericExtId = dataset.dryadDetails.extIdNumeric;
      const journal = dataset.journalIssn
        ? journalByIssn.get(formatIssn(dataset.journalIssn))
        : null;
      logger.info(
        `[${numericExtId}] ${journal?.title} (${journal?.sjrScore}) - "${dataset.title}" - ${dataset.publicationDate}`,
      );
    }

    const dbMutex = new Mutex();

    const statusCounts: Record<string, number> = {
      not_flagged_for_review: 0,
      reviewed_by_ai: 0,
      flagged_for_review: 0,
      failed: 0,
      meta_analysis: 0,
    };

    await pMap(
      downloadedDatasets.slice(0, numDatasetsToAnalyze),
      async (dataset, i) => {
        const numericExtId = dataset.dryadDetails.extIdNumeric;
        const excelFiles = dataset.dataFiles.filter(
          (f) => f.fileType === "excel",
        );
        logger.info(
          `[${i}] Analyzing dataset ${numericExtId} from ${dataset.publicationDate} with ${excelFiles.length} Excel files ("${dataset.title}")`,
        );

        // Check if this is a meta-analysis and skip if so
        try {
          const isMetaAnalysis = await checkIsMetaAnalysis(dataset);
          if (isMetaAnalysis) {
            await updateDryadDatasetIsMetaAnalysis(numericExtId, true);
            statusCounts.meta_analysis++;
            logger.info(
              `[${i}] Dataset ${numericExtId} classified as meta-analysis - skipping.`,
            );
            return;
          } else {
            await updateDryadDatasetIsMetaAnalysis(numericExtId, false);
          }
        } catch (error) {
          logger.error(
            `[${i}] Error checking meta-analysis for dataset ${numericExtId}: ${error}`,
          );
          // Continue with analysis if meta-analysis check fails
        }

        // Load all downloaded Excel files for this dataset
        const excelFilesData: ExcelFileData[] = [];

        for (
          let j = 0;
          j < Math.min(excelFiles.length, maxExcelFilesPerDataset);
          j++
        ) {
          const excelFile = excelFiles[j];
          if (excelFile.downloadStatus !== "completed") {
            logger.info(
              `[${i}] Skipping file ${j} (${excelFile.filename}) - not downloaded`,
            );
            continue;
          }
          logger.info(
            `[${i}] Loading file ${j}: ${excelFile.filename} (${excelFile.size} bytes)`,
          );
          const excelFileData = loadExcelFileFromDryadIndex(dataset, j);
          excelFilesData.push(excelFileData);
        }

        try {
          // Analyze all files in the dataset together
          logger.debug(
            `[i=${i}] Analyzing dataset extId=${numericExtId} with ${excelFilesData.length} Excel files`,
          );
          const allStrategies = Object.values(StrategyName);
          const { analyses, wasFlaggedForReview, aiReviewCompleted } =
            await analyzeDataset(excelFilesData, allStrategies);
          logger.debug(
            `[i=${i}] Analyzed dataset extId=${numericExtId} with ${excelFilesData.length} Excel files`,
          );
          // Save results from each analysis to JSON (backward compatibility)
          // Protect JSON file writes with mutex
          await dbMutex.withLock(async () => {
            analysisResultsDb.data.results[numericExtId] = {};
            for (const analysis of analyses) {
              const duplicateRows =
                analysis.results[StrategyName.DuplicateRows]?.duplicateRows ||
                [];
              const duplicateRowEntropyScores = duplicateRows
                .map((row) => row.matrixSizeAdjustedEntropyScore)
                .slice(0, 20);
              const repeatedColumnSequences =
                analysis.results[StrategyName.RepeatedColumnSequences]
                  ?.sequences || [];
              const columnSequencesEntropyScores = repeatedColumnSequences
                .map((seq) => seq.matrixSizeAdjustedEntropyScore)
                .slice(0, 20);

              const analysisResults: AnalysisResults = {
                filename: analysis.excelFileName,
                duplicateRowEntropyScores,
                columnSequencesEntropyScores,
                analysisVersion: "2025.07.04",
              };
              analysisResultsDb.data.results[numericExtId][
                analysis.excelFileName
              ] = analysisResults;
              logger.info(
                `[i=${i}] Finished analyzing excel file '${analysis.excelFileName}' belonging to ${numericExtId}.`,
              );
            }

            await analysisResultsDb.write();
          });
          logger.debug(
            `[${i}] Saved analysis results for dataset extId=${numericExtId}`,
          );

          // Update analysis status based on the result (SQL updates are safe without mutex)
          if (!wasFlaggedForReview) {
            await updateDryadDatasetAnalysisStatus(
              numericExtId,
              "not_flagged_for_review",
            );
            statusCounts.not_flagged_for_review++;
            logger.info(
              `[${i}] Dataset ${numericExtId} analyzed - no suspicious findings requiring AI review.`,
            );
          } else if (aiReviewCompleted) {
            await updateDryadDatasetAnalysisStatus(
              numericExtId,
              "reviewed_by_ai",
            );
            statusCounts.reviewed_by_ai++;
            logger.info(
              `[${i}] Dataset ${numericExtId} analyzed and AI review completed.`,
            );
          } else {
            // Was flagged but AI review didn't complete (shouldn't happen normally)
            await updateDryadDatasetAnalysisStatus(
              numericExtId,
              "flagged_for_review",
            );
            statusCounts.flagged_for_review++;
            logger.info(
              `[${i}] Dataset ${numericExtId} flagged for AI review but review incomplete.`,
            );
          }
        } catch (error) {
          logger.error(
            `[i=${i}] Error analyzing dataset extId=${numericExtId}: ${error}`,
          );
          await updateDryadDatasetAnalysisStatus(numericExtId, "failed");
          statusCounts.failed++;
          logger.info(`[i=${i}] Dataset ${numericExtId} marked as failed.`);
        }
      },
      { concurrency: 5 },
    );

    const total = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);
    logger.info(
      `Done. ${total} dataset(s) processed: ` +
        Object.entries(statusCounts)
          .map(([status, count]) => `${status}: ${count}`)
          .join(", "),
    );

    await closeDb();
    process.exit(0);
  });

program.parse();
