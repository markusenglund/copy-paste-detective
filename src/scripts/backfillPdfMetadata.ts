import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { db } from "../db";
import { articles } from "../repositories/articles/schema";
import { upsertPdfFile } from "../repositories/pdfFiles/pdfFilesRepository";
import { logger } from "../utils/logger";
import { inArray } from "drizzle-orm";

async function backfillPdfMetadata(): Promise<void> {
  logger.info("Starting PDF metadata backfill...");

  const articlesWithPdfs = await db
    .select()
    .from(articles)
    .where(
      inArray(articles.pdfDownloadStatus, ["completed", "manually_added"]),
    );

  logger.info(
    `Found ${articlesWithPdfs.length} articles with PDFs to backfill`,
  );

  let successCount = 0;
  let missingCount = 0;
  let errorCount = 0;

  for (let i = 0; i < articlesWithPdfs.length; i++) {
    const article = articlesWithPdfs[i];
    const pdfDir = join(process.cwd(), `data/pdfs/${article.id}`);

    try {
      const files = await readdir(pdfDir);

      const pdfFiles = files.filter((file) =>
        file.toLowerCase().endsWith(".pdf"),
      );

      if (pdfFiles.length === 0) {
        logger.warn(
          `[${i + 1}/${articlesWithPdfs.length}] No PDF found for article ${article.id}`,
        );
        missingCount++;
        continue;
      }

      if (pdfFiles.length > 1) {
        logger.warn(
          `[${i + 1}/${articlesWithPdfs.length}] Multiple PDFs found for article ${article.id}, using first one: ${pdfFiles[0]}`,
        );
      }

      const filename = pdfFiles[0];
      const filePath = join(pdfDir, filename);
      const stats = await stat(filePath);

      await upsertPdfFile({
        articleId: article.id,
        filename,
        size: stats.size,
        url: article.fullPdfUrl ?? null,
      });

      logger.info(
        `[${i + 1}/${articlesWithPdfs.length}] Backfilled metadata for article ${article.id}: ${filename} (${stats.size} bytes)`,
      );
      successCount++;
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "ENOENT"
      ) {
        logger.warn(
          `[${i + 1}/${articlesWithPdfs.length}] PDF directory not found for article ${article.id}`,
        );
        missingCount++;
      } else {
        logger.error(
          `[${i + 1}/${articlesWithPdfs.length}] Error processing article ${article.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        errorCount++;
      }
    }
  }

  logger.info(
    `Backfill complete. Success: ${successCount}, Missing: ${missingCount}, Errors: ${errorCount}`,
  );
}

backfillPdfMetadata()
  .then(() => {
    logger.info("Done!");
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`Backfill failed: ${error}`);
    process.exit(1);
  });
