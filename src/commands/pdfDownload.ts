import { Command } from "@commander-js/extra-typings";
import { getDryadDatasetsForPdfDownload } from "../repositories/articles/articlesRepository";
import { insertPdfDatasetFile } from "../repositories/datasets/unifiedDatasetsRepository";
import { buildOpenalexContentUrl, downloadPdf } from "../utils/downloadPdf";
import { parseIntArgument } from "../utils/command";
import { logger } from "../utils/logger";
import { closeDb } from "../db";

const program = new Command();

program
  .name("pdf-download")
  .description(
    "Download PDF files for articles connected to suspicious datasets",
  )
  .version("0.1.0")
  .option(
    "--limit <number>",
    "Maximum number of PDFs to download",
    parseIntArgument,
    10,
  )
  .option(
    "--extId <number>",
    "Download PDF only for specific dataset extId (ignores download status)",
    parseIntArgument,
  )
  .action(async (options) => {
    try {
      logger.info("Fetching dryad datasets with PDFs to download...");
      const datasetsToDownload = await getDryadDatasetsForPdfDownload(
        options.limit,
        options.extId,
      );

      logger.info(
        `Found ${datasetsToDownload.length} datasets with PDFs to download`,
      );

      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < datasetsToDownload.length; i++) {
        const dataset = datasetsToDownload[i];
        logger.info(
          `[${i + 1}/${datasetsToDownload.length}] Processing dataset ${dataset.datasetId} extId=${dataset.datasetExtId}: "${dataset.articleTitle}"`,
        );

        try {
          const { filePath, filename, size } = await downloadPdf({
            datasetExtId: dataset.datasetExtId,
            openalexId: dataset.extOpenalexId,
          });

          await insertPdfDatasetFile({
            datasetId: dataset.datasetId,
            source: "dryad",
            filename,
            size,
            sourceUrl: buildOpenalexContentUrl(dataset.extOpenalexId),
          });

          logger.info(`Successfully downloaded PDF to ${filePath}`);
          successCount++;
        } catch (err) {
          logger.error(
            `Failed to download PDF for dataset ${dataset.datasetId} extId=${dataset.datasetExtId}: ${err instanceof Error ? err.message : String(err)}`,
          );
          failedCount++;
        }
      }

      logger.info(
        `Download complete. Success: ${successCount}, Failed: ${failedCount}`,
      );
    } finally {
      await closeDb();
    }
  });

program.parse();
