import { Command } from "@commander-js/extra-typings";
import {
  getPmcDatasetsForDownload,
  getPmcDatasetWithFiles,
  updatePmcDatasetDownloadStatus,
  type PmcDatasetWithFiles,
} from "../repositories/pmcDatasets/pmcDatasetsRepository";
import { updatePmcDataFileDownloadStatus } from "../repositories/pmcDataFiles/pmcDataFilesRepository";
import { downloadPmcFile } from "../pmc/downloadPmcFile";
import { s3UrlToHttps } from "../pmc/getS3Metadata";
import { parseIntArgument, parseExtPmcIds } from "../utils/command";
import { logger } from "../utils/logger";
import { closeDb } from "../db";

const program = new Command();

program
  .name("pmc-download")
  .description(
    "Download excel files from PMC S3 that were previously indexed in the database.",
  )
  .version("0.1.0")
  .argument("[count]", "Number of datasets to download", parseIntArgument, 100)
  .option(
    "--extId <extIds>",
    "Download specific datasets by PMC ID (comma-separated)",
    parseExtPmcIds,
  )
  .action(async (count, options) => {
    try {
      const maxFileSize = 10_000_000; // 10MB
      let datasetsToDownload: PmcDatasetWithFiles[];
      logger.info("PMC download");
      if (options.extId) {
        const datasets: PmcDatasetWithFiles[] = [];
        for (const extPmcId of options.extId) {
          const dataset = await getPmcDatasetWithFiles(extPmcId);
          if (!dataset) {
            logger.error(`Dataset with PMC ID ${extPmcId} not found.`);
            process.exit(1);
          }
          datasets.push(dataset);
        }
        datasetsToDownload = datasets;
      } else {
        logger.info("Fetching datasets for download...");
        const datasets = await getPmcDatasetsForDownload(count);
        logger.info(`Fetched ${datasets.length} candidate datasets`);

        const downloadable: (PmcDatasetWithFiles & {
          citationScore: number;
        })[] = [];
        const skipped: (PmcDatasetWithFiles & { citationScore: number })[] = [];

        for (const dataset of datasets) {
          const hasDownloadableFile = dataset.dataFiles.some(
            (file) => file.size <= maxFileSize,
          );
          if (hasDownloadableFile) {
            downloadable.push(dataset);
          } else {
            skipped.push(dataset);
          }
        }

        for (const dataset of skipped) {
          logger.info(
            `Skipping dataset ${dataset.extPmcId} - all files exceed ${maxFileSize / 1_000_000}MB`,
          );
          await updatePmcDatasetDownloadStatus(dataset.extPmcId, "skipped");
        }

        logger.info(
          `Found ${downloadable.length} datasets to download, ${skipped.length} skipped`,
        );

        for (const dataset of downloadable) {
          logger.info(
            `[${dataset.extPmcId}] ${dataset.citationScore.toFixed(2)} - "${dataset.title}" - ${dataset.pmcPublicationDate}`,
          );
        }

        datasetsToDownload = downloadable;
      }

      let totalDatasetsCompleted = 0;
      let totalDatasetsFailed = 0;
      let totalFilesDownloaded = 0;
      let totalFilesFailed = 0;

      for (let i = 0; i < datasetsToDownload.length; i++) {
        const dataset = datasetsToDownload[i];
        logger.info(
          `[${i}] Downloading dataset ${dataset.extPmcId} from ${dataset.pmcPublicationDate} ("${dataset.title}")`,
        );
        logger.info(
          `${dataset.dataFiles.length} Excel files found: ${dataset.dataFiles.map((file) => file.filename).join(", ")}`,
        );

        let numFailedDownloads = 0;

        for (const dataFile of dataset.dataFiles) {
          if (dataFile.size <= maxFileSize) {
            try {
              const url = s3UrlToHttps(dataFile.s3Url);
              await downloadPmcFile({
                url,
                filename: dataFile.filename,
                pmcid: dataset.extPmcId,
              });
              await updatePmcDataFileDownloadStatus(dataFile.id, "completed");
              totalFilesDownloaded += 1;
            } catch (err) {
              logger.error(err);
              await updatePmcDataFileDownloadStatus(dataFile.id, "failed");
              numFailedDownloads += 1;
              totalFilesFailed += 1;
            }
          }
        }


        if (numFailedDownloads === dataset.dataFiles.length) {
          await updatePmcDatasetDownloadStatus(dataset.extPmcId, "failed");
          totalDatasetsFailed += 1;
        } else {
          await updatePmcDatasetDownloadStatus(dataset.extPmcId, "completed");
          totalDatasetsCompleted += 1;
        }
      }

      logger.info(
        `\nSummary: ${totalDatasetsCompleted} datasets completed, ${totalDatasetsFailed} failed. ${totalFilesDownloaded} Excel files downloaded, ${totalFilesFailed} failed.`,
      );
    } finally {
      await closeDb();
    }
  });

program.parse();
