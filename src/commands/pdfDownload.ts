import { Command } from "@commander-js/extra-typings";
import {
  getArticlesForPdfDownload,
  updateArticlePdfDownloadStatus,
} from "../repositories/articles/articlesRepository";
import { upsertPdfFile } from "../repositories/pdfFiles/pdfFilesRepository";
import { downloadPdf } from "../utils/downloadPdf";
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
  .action(async (options) => {
    try {
      logger.info("Fetching articles with PDFs to download...");
      const articlesToDownload = await getArticlesForPdfDownload(options.limit);

      logger.info(
        `Found ${articlesToDownload.length} articles with PDFs to download`,
      );

      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < articlesToDownload.length; i++) {
        const article = articlesToDownload[i];
        logger.info(
          `[${i + 1}/${articlesToDownload.length}] Processing article ${article.id}: "${article.title}"`,
        );

        try {
          await updateArticlePdfDownloadStatus(article.id, "in_progress");

          const { filePath, filename, size } = await downloadPdf({
            articleId: article.id,
            pdfUrl: article.fullPdfUrl!,
          });

          await updateArticlePdfDownloadStatus(article.id, "completed");

          await upsertPdfFile({
            articleId: article.id,
            filename,
            size,
            url: article.fullPdfUrl ?? null,
          });

          logger.info(`Successfully downloaded PDF to ${filePath}`);
          successCount++;
        } catch (err) {
          logger.error(
            `Failed to download PDF for article ${article.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
          await updateArticlePdfDownloadStatus(article.id, "failed");
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
