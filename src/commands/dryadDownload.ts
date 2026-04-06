import { Command } from "@commander-js/extra-typings";
import {
  getDryadDatasetsForDownload,
  getDryadDatasetByExtId,
  updateDryadDatasetDownloadStatus,
  updateDatasetFileDownloadStatus,
  type DryadDatasetWithFiles,
  type DatasetFileWithDryadDetails,
} from "../repositories/datasets/unifiedDatasetsRepository";
import { downloadFile } from "../dryad/downloadFile";
import { parseIntArgument, parseExtIds } from "../utils/command";
import { logger } from "../utils/logger";
import { closeDb } from "../db";

const program = new Command();

program
  .name("dryad-download")
  .description(
    "Download excel files from Dryad that were previously indexed in the database.",
  )
  .version("0.1.0")
  .argument("[count]", "Number of datasets to download", parseIntArgument, 100)
  .option(
    "--extId <extIds>",
    "Download specific datasets by Dryad extId (comma-separated)",
    parseExtIds,
  )
  .action(async (count, options) => {
    try {
      const maxFileSize = 10_000_000; // 10MB
      let datasetsToDownload: DryadDatasetWithFiles[];
      logger.info("Dryad download");
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
        datasetsToDownload = datasets;
      } else {
        logger.info("Fetching datasets for download...");
        const datasets = await getDryadDatasetsForDownload(count);
        logger.info(`Fetched ${datasets.length} candidate datasets`);

        const excelFilesOf = (
          d: DryadDatasetWithFiles,
        ): DatasetFileWithDryadDetails[] =>
          d.dataFiles.filter((f) => f.fileType === "excel");

        // Separate datasets by whether they have downloadable files
        const downloadable: (DryadDatasetWithFiles & {
          citationScore: number;
        })[] = [];
        const skipped: (DryadDatasetWithFiles & { citationScore: number })[] =
          [];

        for (const dataset of datasets) {
          const hasDownloadableFile = excelFilesOf(dataset).some(
            (file) => file.size <= maxFileSize,
          );
          if (hasDownloadableFile) {
            downloadable.push(dataset);
          } else {
            skipped.push(dataset);
          }
        }

        // Mark skipped datasets (all files too large)
        for (const dataset of skipped) {
          const numericExtId = dataset.dryadDetails.extIdNumeric;
          logger.info(
            `Skipping dataset ${numericExtId} - all files exceed ${maxFileSize / 1_000_000}MB`,
          );
          await updateDryadDatasetDownloadStatus(numericExtId, "skipped");
        }

        logger.info(
          `Found ${downloadable.length} datasets to download, ${skipped.length} skipped`,
        );

        for (const dataset of downloadable) {
          const numericExtId = dataset.dryadDetails.extIdNumeric;
          logger.info(
            `[${numericExtId}] ${dataset.citationScore.toFixed(2)} - "${dataset.title}" - ${dataset.publicationDate}`,
          );
        }

        datasetsToDownload = downloadable;
      }

      // Single download loop for all cases
      for (let i = 0; i < datasetsToDownload.length; i++) {
        const dataset = datasetsToDownload[i];
        const numericExtId = dataset.dryadDetails.extIdNumeric;
        const excelFiles = dataset.dataFiles.filter(
          (f) => f.fileType === "excel",
        );
        const readmeFile = dataset.dataFiles.find(
          (f) => f.fileType === "readme",
        );
        logger.info(
          `[${i}] Downloading dataset ${numericExtId} from ${dataset.publicationDate} ("${dataset.title}")`,
        );
        logger.info(
          `${excelFiles.length} Excel files found:\n ${excelFiles.map((file) => file.filename).join("\n")}`,
        );

        let numFailedDownloads = 0;

        for (const excelFile of excelFiles) {
          if (excelFile.size <= maxFileSize) {
            const extFileId = excelFile.dryadFileDetails?.extFileId;
            if (!extFileId) continue;
            try {
              await downloadFile({
                fileId: extFileId,
                filename: excelFile.filename,
                datasetId: numericExtId,
              });
              await updateDatasetFileDownloadStatus(excelFile.id, "completed");
            } catch (err) {
              logger.error(err);
              await updateDatasetFileDownloadStatus(excelFile.id, "failed");
              numFailedDownloads += 1;
            }
          }
        }
        if (readmeFile) {
          const extFileId = readmeFile.dryadFileDetails?.extFileId;
          if (extFileId) {
            try {
              await downloadFile({
                fileId: extFileId,
                filename: readmeFile.filename,
                datasetId: numericExtId,
              });
              await updateDatasetFileDownloadStatus(readmeFile.id, "completed");
            } catch (err) {
              logger.error(err);
              await updateDatasetFileDownloadStatus(readmeFile.id, "failed");
            }
          }
        }
        if (numFailedDownloads === excelFiles.length) {
          await updateDryadDatasetDownloadStatus(numericExtId, "failed");
        } else {
          await updateDryadDatasetDownloadStatus(numericExtId, "completed");
        }
      }
    } finally {
      await closeDb();
    }
  });

program.parse();
