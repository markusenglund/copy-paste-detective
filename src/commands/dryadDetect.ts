import { Command } from "@commander-js/extra-typings";
import {
  getDryadDatasetByExtId,
  updateDryadDatasetAnalysisStatus,
} from "../repositories/datasets/unifiedDatasetsRepository";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { StrategyName } from "../types/strategies";
import { parseIntArgument, parseStrategies } from "../utils/command";
import { maxExcelFilesPerDatasetForCopyPasteCheck } from "../config/config";
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
      const dataset = await getDryadDatasetByExtId(datasetExtId);
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

      const excelFiles = dataset.dataFiles.filter(
        (f) => f.fileType === "excel",
      );

      // If fileIndex is not provided, analyze all Excel files in the dataset.
      const filesToAnalyze =
        fileIndex === undefined ? excelFiles : [excelFiles[fileIndex]];

      const downloadedExcelFiles: ExcelFileData[] = [];
      for (
        let i = 0;
        i <
        Math.min(
          filesToAnalyze.length,
          maxExcelFilesPerDatasetForCopyPasteCheck,
        );
        i++
      ) {
        const excelFile = filesToAnalyze[i];
        if (excelFile.downloadStatus !== "completed") {
          logger.info(
            `Excel file '${excelFile.filename}' is not downloaded. Status: ${excelFile.downloadStatus}`,
          );
          continue;
        }
        logger.info(
          `Analyzing ${excelFile.filename} from dataset ${dataset.dryadDetails.extIdNumeric} from ${dataset.publicationDate} (${excelFile.size} bytes) - "${dataset.title}"`,
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
          await updateDryadDatasetAnalysisStatus(
            datasetExtId,
            "not_flagged_for_review",
          );
        } else if (aiReviewCompleted) {
          await updateDryadDatasetAnalysisStatus(
            datasetExtId,
            "reviewed_by_ai",
          );
        } else {
          await updateDryadDatasetAnalysisStatus(
            datasetExtId,
            "flagged_for_review",
          );
        }
      }
    } catch (error) {
      console.error(error);
      if (fileIndex === undefined) {
        await updateDryadDatasetAnalysisStatus(datasetExtId, "failed");
      }
      throw error;
    } finally {
      await closeDb();
    }
  });

program.parse();
