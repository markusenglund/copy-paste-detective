import { Command } from "@commander-js/extra-typings";
import pMap from "p-map";
import Mutex from "p-mutex";
import {
  getDownloadedNotAnalyzedDatasetsWithFiles,
  updateDatasetAnalysisStatus,
  resetAnalysisStatusesExceptFailed,
} from "../repositories/datasets/datasetsRepository";
import { db as analysisResultsDb } from "../dryad/analysisResultsDb";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { StrategyName } from "../types/strategies";
import { analyzeDataset } from "../detection/analyzeDataset";
import { AnalysisResults } from "../dryad/analysisResultsDb";
import { parseIntArgument } from "../utils/command";
import {
  getJournalsByIssnMap,
  formatIssn,
} from "../repositories/journals/journalsRepository";
import { maxExcelFilesPerDataset } from "../config/config";
import { ExcelFileData } from "../types/ExcelFileData";
import { logger } from "../utils/logger";
import { closeDb } from "../db";

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
  .action(async (count, options) => {
    // Handle --reset option
    if (options.reset) {
      logger.info(
        "Reset option detected - resetting all non-failed analysis statuses to 'not_analyzed'...",
      );
      const resetCount = await resetAnalysisStatusesExceptFailed();
      logger.info(
        `Reset ${resetCount} dataset(s) from completed analysis states back to 'not_analyzed'`,
      );
    }

    const journalByIssn = await getJournalsByIssnMap();

    // Get datasets that have been downloaded but not yet analyzed
    const downloadedDatasets = (
      await getDownloadedNotAnalyzedDatasetsWithFiles()
    ).toSorted((a, b) => {
      return (
        new Date(b.dryadPublicationDate).getTime() -
        new Date(a.dryadPublicationDate).getTime()
      );
    });

    const numDatasetsToAnalyze = Math.min(count, downloadedDatasets.length);

    logger.info(
      `Analyzing ${numDatasetsToAnalyze} of ${downloadedDatasets.length} datasets that are downloaded and not yet analyzed.`,
    );

    // For each dataset, log the journal name, journal score and title
    for (const dataset of downloadedDatasets.slice(0, numDatasetsToAnalyze)) {
      const journal = dataset.journalIssn
        ? journalByIssn.get(formatIssn(dataset.journalIssn))
        : null;
      logger.info(
        `[${dataset.extId}] ${journal?.title} (${journal?.sjrScore}) - "${dataset.title}" - ${dataset.dryadPublicationDate}`,
      );
    }

    const dbMutex = new Mutex();

    await pMap(
      downloadedDatasets.slice(0, numDatasetsToAnalyze),
      async (dataset, i) => {
        logger.info(
          `[${i}] Analyzing dataset ${dataset.extId} from ${dataset.dryadPublicationDate} with ${dataset.excelFiles.length} Excel files ("${dataset.title}")`,
        );

        // Load all downloaded Excel files for this dataset
        const excelFilesData: ExcelFileData[] = [];

        for (
          let j = 0;
          j < Math.min(dataset.excelFiles.length, maxExcelFilesPerDataset);
          j++
        ) {
          const excelFile = dataset.excelFiles[j];
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
            `[i=${i}] Analyzing dataset extId=${dataset.extId} with ${excelFilesData.length} Excel files`,
          );
          const allStrategies = Object.values(StrategyName);
          const { analyses, wasFlaggedForReview, aiReviewCompleted } =
            await analyzeDataset(excelFilesData, allStrategies);
          logger.debug(
            `[i=${i}] Analyzed dataset extId=${dataset.extId} with ${excelFilesData.length} Excel files`,
          );
          // Save results from each analysis to JSON (backward compatibility)
          // Protect JSON file writes with mutex
          await dbMutex.withLock(async () => {
            analysisResultsDb.data.results[dataset.extId] = {};
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
              analysisResultsDb.data.results[dataset.extId][
                analysis.excelFileName
              ] = analysisResults;
              logger.info(
                `[i=${i}] Finished analyzing excel file '${analysis.excelFileName}' belonging to ${dataset.extId}.`,
              );
            }

            await analysisResultsDb.write();
          });
          logger.debug(
            `[${i}] Saved analysis results for dataset extId=${dataset.extId}`,
          );

          // Update analysis status based on the result (SQL updates are safe without mutex)
          if (!wasFlaggedForReview) {
            await updateDatasetAnalysisStatus(
              dataset.extId,
              "not_flagged_for_review",
            );
            logger.info(
              `[${i}] Dataset ${dataset.extId} analyzed - no suspicious findings requiring AI review.`,
            );
          } else if (aiReviewCompleted) {
            await updateDatasetAnalysisStatus(dataset.extId, "reviewed_by_ai");
            logger.info(
              `[${i}] Dataset ${dataset.extId} analyzed and AI review completed.`,
            );
          } else {
            // Was flagged but AI review didn't complete (shouldn't happen normally)
            await updateDatasetAnalysisStatus(
              dataset.extId,
              "flagged_for_review",
            );
            logger.info(
              `[${i}] Dataset ${dataset.extId} flagged for AI review but review incomplete.`,
            );
          }
        } catch (error) {
          logger.error(
            `[i=${i}] Error analyzing dataset extId=${dataset.extId}: ${error}`,
          );
          await updateDatasetAnalysisStatus(dataset.extId, "failed");
          logger.info(`[i=${i}] Dataset ${dataset.extId} marked as failed.`);
        }
      },
      { concurrency: 5 },
    );

    await closeDb();
    process.exit(0);
  });

program.parse();
