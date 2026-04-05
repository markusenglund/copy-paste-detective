import { Command } from "@commander-js/extra-typings";
import { stat } from "node:fs/promises";
import { basename } from "node:path";
import {
  getPmcDatasetsForDownload,
  getPmcDatasetByExtId as getPmcDatasetWithFiles,
  updateDatasetDownloadStatus as updatePmcDatasetDownloadStatus,
  type DatasetWithFiles as PmcDatasetWithFiles,
  updateDatasetFileDownloadStatus as updatePmcDataFileDownloadStatus,
  getPmcDatasetFileS3Url,
  insertPdfDatasetFile,
  updatePmcDatasetFullText,
} from "../repositories/datasets/unifiedDatasetsRepository";
import { downloadPmcFile } from "../pmc/downloadPmcFile";
import { s3UrlToHttps } from "../pmc/getS3Metadata";
import { s3Fetch } from "../pmc/pmcFetch";
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
      let totalDatasetsSkipped = 0;
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
            `Skipping dataset ${dataset.extId} - all files exceed ${maxFileSize / 1_000_000}MB`,
          );
          await updatePmcDatasetDownloadStatus(dataset.extId, "skipped");
        }

        totalDatasetsSkipped = skipped.length;

        logger.info(
          `Found ${downloadable.length} datasets to download, ${skipped.length} skipped`,
        );

        for (const dataset of downloadable) {
          logger.info(
            `[${dataset.extId}] ${dataset.citationScore.toFixed(2)} - "${dataset.title}" - ${dataset.publicationDate}`,
          );
        }

        datasetsToDownload = downloadable;
      }

      let totalDatasetsCompleted = 0;
      let totalDatasetsFailed = 0;
      let totalFilesDownloaded = 0;
      let totalFilesFailed = 0;
      let totalSizeDownloaded = 0;
      let totalPdfsDownloaded = 0;
      let totalPdfsFailed = 0;
      let totalFullTextsDownloaded = 0;
      let totalFullTextsFailed = 0;

      for (let i = 0; i < datasetsToDownload.length; i++) {
        const dataset = datasetsToDownload[i];
        logger.info(
          `[${i}] Downloading dataset ${dataset.extId} from ${dataset.publicationDate} ("${dataset.title}")`,
        );
        logger.info(
          `${dataset.dataFiles.length} Excel files found: ${dataset.dataFiles.map((file) => file.filename).join(", ")}`,
        );

        let numFailedDownloads = 0;

        for (const dataFile of dataset.dataFiles) {
          if (dataFile.size <= maxFileSize) {
            try {
              const s3Url = await getPmcDatasetFileS3Url(dataFile.id);
              if (!s3Url) throw new Error("Missing S3 URL");
              const url = s3UrlToHttps(s3Url);
              await downloadPmcFile({
                url,
                filename: dataFile.filename,
                pmcid: dataset.extId,
              });
              await updatePmcDataFileDownloadStatus(dataFile.id, "completed");
              totalFilesDownloaded += 1;
              totalSizeDownloaded += dataFile.size || 0;
            } catch (err) {
              logger.error(err);
              await updatePmcDataFileDownloadStatus(dataFile.id, "failed");
              numFailedDownloads += 1;
              totalFilesFailed += 1;
            }
          }
        }

        // Download PDF
        const fullPdfUrl = dataset.pmcDetails?.fullPdfUrl;
        if (fullPdfUrl) {
          try {
            const pdfFilename =
              basename(new URL(fullPdfUrl).pathname) || `${dataset.extId}.pdf`;
            const filePath = await downloadPmcFile({
              url: fullPdfUrl,
              filename: pdfFilename,
              pmcid: dataset.extId,
            });
            const fileStats = await stat(filePath);
            await insertPdfDatasetFile({
              datasetId: dataset.id,
              filename: pdfFilename,
              size: fileStats.size,
            });
            totalPdfsDownloaded += 1;
            logger.info(`Downloaded PDF: ${pdfFilename}`);
          } catch (err) {
            logger.error(`Failed to download PDF for ${dataset.extId}: ${err}`);
            totalPdfsFailed += 1;
          }
        }

        // Download full text
        const textUrl = dataset.pmcDetails?.textUrl;
        if (textUrl) {
          try {
            const response = await s3Fetch(textUrl);
            if (!response.ok) {
              throw new Error(
                `Failed to fetch full text: ${response.status} ${response.statusText}`,
              );
            }
            const fullText = await response.text();
            await updatePmcDatasetFullText(dataset.id, fullText);
            totalFullTextsDownloaded += 1;
            logger.info(`Downloaded full text for ${dataset.extId}`);
          } catch (err) {
            logger.error(
              `Failed to download full text for ${dataset.extId}: ${err}`,
            );
            totalFullTextsFailed += 1;
          }
        }

        if (numFailedDownloads === dataset.dataFiles.length) {
          await updatePmcDatasetDownloadStatus(dataset.extId, "failed");
          totalDatasetsFailed += 1;
        } else {
          await updatePmcDatasetDownloadStatus(dataset.extId, "completed");
          totalDatasetsCompleted += 1;
        }
      }

      logger.info(
        `\nSummary: ${totalDatasetsCompleted} datasets completed, ${totalDatasetsFailed} failed, ${totalDatasetsSkipped} skipped (all files > ${maxFileSize / 1_000_000}MB). ${totalFilesDownloaded} Excel files downloaded (${(totalSizeDownloaded / 1_000_000).toFixed(2)} MB), ${totalFilesFailed} failed. ${totalPdfsDownloaded} PDFs downloaded, ${totalPdfsFailed} failed. ${totalFullTextsDownloaded} full texts downloaded, ${totalFullTextsFailed} failed.`,
      );
    } finally {
      await closeDb();
    }
  });

program.parse();
