import { Command } from "@commander-js/extra-typings";
import pMap from "p-map";
import Mutex from "p-mutex";
import {
  getDownloadedNotAnalyzedPmcDatasetsWithFiles,
  getPmcDatasetByExtId,
  updateDatasetAnalysisStatus,
  updateDatasetIsMetaAnalysis,
  resetPmcAnalysisStatusesExceptFailed,
} from "../repositories/datasets/unifiedDatasetsRepository";
import { classifyMetaAnalysisWithCache } from "../ai/useCases/classifyMetaAnalysis";
import { db as analysisResultsDb } from "../dryad/analysisResultsDb";
import { loadExcelFileFromPmcDataset } from "../utils/loadExcelFileFromPmcDataset";
import { StrategyName } from "../types/strategies";
import { analyzeDataset } from "../detection/analyzeDataset";
import { AnalysisResults } from "../dryad/analysisResultsDb";
import { parseIntArgument, parseExtPmcIds } from "../utils/command";
import {
  formatIssn,
  getJournalsByIssnMap,
} from "../repositories/journals/journalsRepository";
import { maxExcelFilesPerDataset } from "../config/config";
import { ExcelFileData } from "../types/ExcelFileData";
import { logger } from "../utils/logger";
import { closeDb } from "../db";
import type { DatasetWithFiles } from "../repositories/datasets/unifiedDatasetsRepository";

const metaAnalysisPattern = /meta[- ]?analysis|systematic review/i;

async function checkIsMetaAnalysis(
  dataset: DatasetWithFiles,
): Promise<boolean> {
  if (metaAnalysisPattern.test(dataset.title)) {
    return true;
  }
  if (!dataset.abstract) {
    return false;
  }
  const result = await classifyMetaAnalysisWithCache({
    title: dataset.title,
    abstract: dataset.abstract,
    dataDescription: "No data description available.",
    datasetId: dataset.id,
    dryadDatasetId: dataset.id, // Fallback for backward compat in the AI caching logic if needed
  });

  return result.isMetaAnalysis;
}

const program = new Command();

program
  .name("pmc-detect-all")
  .description("Analyze excel files from downloaded PMC datasets.")
  .version("0.1.0")
  .argument("[count]", "Number of datasets to analyze", parseIntArgument, 100)
  .option(
    "--reset",
    "Reset all non-failed analysis statuses to 'not_analyzed' before processing",
  )
  .option(
    "--extId <extIds>",
    "Analyze specific datasets by PMC extId (comma-separated)",
    parseExtPmcIds,
  )
  .action(async (count, options) => {
    if (options.reset) {
      logger.info(
        "Reset option detected - resetting all non-failed PMC analysis statuses to 'not_analyzed'...",
      );
      const resetCount = await resetPmcAnalysisStatusesExceptFailed();
      logger.info(
        `Reset ${resetCount} PMC dataset(s) from completed analysis states back to 'not_analyzed'`,
      );
    }

    const journalByIssn = await getJournalsByIssnMap();
    let downloadedDatasets: DatasetWithFiles[];

    if (options.extId) {
      const datasets: DatasetWithFiles[] = [];
      for (const extId of options.extId) {
        const dataset = await getPmcDatasetByExtId(extId);
        if (!dataset) {
          logger.error(`PMC dataset with extId ${extId} not found.`);
          process.exit(1);
        }
        datasets.push(dataset);
      }
      downloadedDatasets = datasets;
    } else {
      downloadedDatasets = (
        await getDownloadedNotAnalyzedPmcDatasetsWithFiles()
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

    for (const dataset of downloadedDatasets.slice(0, numDatasetsToAnalyze)) {
      const journal = dataset.journalIssn
        ? journalByIssn.get(formatIssn(dataset.journalIssn))
        : null;
      logger.info(
        `[${dataset.extId}] ${journal?.title} (${journal?.sjrScore}) - "${dataset.title}" - ${dataset.publicationDate}`,
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
        logger.info(
          `[${i}] Analyzing PMC dataset ${dataset.extId} from ${dataset.publicationDate} with ${dataset.dataFiles.length} Excel files ("${dataset.title}")`,
        );

        try {
          const isMetaAnalysis = await checkIsMetaAnalysis(dataset);
          if (isMetaAnalysis) {
            await updateDatasetIsMetaAnalysis(dataset.id, true);
            statusCounts.meta_analysis++;
            logger.info(
              `[${i}] Dataset ${dataset.extId} classified as meta-analysis - skipping.`,
            );
            return;
          } else {
            await updateDatasetIsMetaAnalysis(dataset.id, false);
          }
        } catch (error) {
          logger.error(
            `[${i}] Error checking meta-analysis for dataset ${dataset.extId}: ${error}`,
          );
        }

        const excelFilesData: ExcelFileData[] = [];
        for (
          let j = 0;
          j < Math.min(dataset.dataFiles.length, maxExcelFilesPerDataset);
          j++
        ) {
          const dataFile = dataset.dataFiles[j];
          if (dataFile.downloadStatus !== "completed") {
            logger.info(
              `[${i}] Skipping file ${j} (${dataFile.filename}) - not downloaded`,
            );
            continue;
          }
          logger.info(
            `[${i}] Loading file ${j}: ${dataFile.filename} (${dataFile.size} bytes)`,
          );
          const excelFileData = loadExcelFileFromPmcDataset(dataset, j);
          excelFilesData.push(excelFileData);
        }

        try {
          logger.debug(
            `[i=${i}] Analyzing dataset extId=${dataset.extId} with ${excelFilesData.length} Excel files`,
          );
          const allStrategies = Object.values(StrategyName);
          const { analyses, wasFlaggedForReview, aiReviewCompleted } =
            await analyzeDataset(excelFilesData, allStrategies);
          logger.debug(`[i=${i}] Analyzed dataset extId=${dataset.extId}`);

          await dbMutex.withLock(async () => {
            // Init dataset obj if not exists
            if (!analysisResultsDb.data.results[dataset.extId]) {
              analysisResultsDb.data.results[dataset.extId] = {};
            }

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
                analysisVersion: "2025.07.04", // Maintain current format/versioning in file
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
            `[${i}] Saved analysis results for PMC dataset extId=${dataset.extId}`,
          );

          if (!wasFlaggedForReview) {
            await updateDatasetAnalysisStatus(
              dataset.id,
              "not_flagged_for_review",
            );
            statusCounts.not_flagged_for_review++;
            logger.info(
              `[${i}] Dataset ${dataset.extId} analyzed - no suspicious findings.`,
            );
          } else if (aiReviewCompleted) {
            await updateDatasetAnalysisStatus(dataset.id, "reviewed_by_ai");
            statusCounts.reviewed_by_ai++;
            logger.info(
              `[${i}] Dataset ${dataset.extId} analyzed and AI review completed.`,
            );
          } else {
            await updateDatasetAnalysisStatus(dataset.id, "flagged_for_review");
            statusCounts.flagged_for_review++;
            logger.info(
              `[${i}] Dataset ${dataset.extId} flagged for AI review but review incomplete.`,
            );
          }
        } catch (error) {
          logger.error(
            `[i=${i}] Error analyzing PMC dataset extId=${dataset.extId}: ${error}`,
          );
          await updateDatasetAnalysisStatus(dataset.id, "failed");
          statusCounts.failed++;
          logger.info(`[i=${i}] Dataset ${dataset.extId} marked as failed.`);
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
