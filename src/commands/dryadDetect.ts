import { Command } from "@commander-js/extra-typings";
import {
  getDatasetWithFiles,
  updateDatasetAnalysisStatus,
} from "../repositories/datasets/datasetsRepository";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { StrategyName } from "../types/strategies";
import { parseIntArgument, parseStrategies } from "../utils/command";
import { maxExcelFilesPerDataset } from "../config/config";
import { analyzeDataset } from "../detection/analyzeDataset";
import { ExcelFileData } from "../types/ExcelFileData";
import { logger } from "../utils/logger";
import { closeDb } from "../db";

const program = new Command();

program
  .name("dryad-detect")
  .description("Analyze an excel file from a downloaded Dryad dataset.")
  .argument("<datasetExtId>", "Dryad dataset external ID", parseIntArgument)
  .argument(
    "[fileIndex]",
    "Index of the file in the excelFiles array of the dataset",
    parseIntArgument,
  )
  .option(
    "--strategies <strategies>",
    "Comma-separated list of strategies to run",
    parseStrategies,
    Object.values(StrategyName),
  )
  .action(async (datasetExtId, fileIndex, options) => {
    try {
      const dataset = await getDatasetWithFiles(datasetExtId);
      if (!dataset) {
        logger.error(
          `Dataset with extId ${datasetExtId} not found in the database.`,
        );
        process.exit(1);
      }
      if (dataset.downloadStatus !== "completed") {
        logger.error(
          `Dataset with extId ${datasetExtId} is not downloaded. Status: ${dataset.downloadStatus}`,
        );
        process.exit(1);
      }

      // If fileIndex is not provided, analyze all Excel files in the dataset.
      const dryadExcelFiles =
        fileIndex === undefined
          ? dataset.excelFiles
          : [dataset.excelFiles[fileIndex]];

      const downloadedExcelFiles: ExcelFileData[] = [];
      for (
        let i = 0;
        i < Math.min(dryadExcelFiles.length, maxExcelFilesPerDataset);
        i++
      ) {
        const dryadExcelFile = dryadExcelFiles[i];
        if (dryadExcelFile.downloadStatus !== "completed") {
          logger.info(
            `Excel file '${dryadExcelFile.filename}' is not downloaded. Status: ${dryadExcelFile.downloadStatus}`,
          );
          continue;
        }
        logger.info(
          `Analyzing ${dryadExcelFile.filename} from dataset ${dataset.extId} from ${dataset.dryadPublicationDate} (${dryadExcelFile.size} bytes) - "${dataset.title}"`,
        );
        const excelFileData = loadExcelFileFromDryadIndex(dataset, i);
        downloadedExcelFiles.push(excelFileData);
      }
      const { wasFlaggedForReview, aiReviewCompleted } = await analyzeDataset(
        downloadedExcelFiles,
        options.strategies,
      );

      // Only update analysisStatus when the full dataset was analyzed
      if (fileIndex === undefined) {
        if (!wasFlaggedForReview) {
          await updateDatasetAnalysisStatus(
            datasetExtId,
            "not_flagged_for_review",
          );
        } else if (aiReviewCompleted) {
          await updateDatasetAnalysisStatus(datasetExtId, "reviewed_by_ai");
        } else {
          await updateDatasetAnalysisStatus(datasetExtId, "flagged_for_review");
        }
      }
    } catch (error) {
      if (fileIndex === undefined) {
        await updateDatasetAnalysisStatus(datasetExtId, "failed");
      }
      throw error;
    } finally {
      await closeDb();
    }
  });

program.parse();
