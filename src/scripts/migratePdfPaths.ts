/**
 * One-off migration script: moves dryad article PDFs from
 * storage/pdfs/{articleId}/ to storage/dryad/{extId}/
 *
 * Run AFTER applying the 0042 database migration.
 * Safe to re-run: skips files that already exist at the destination.
 */
import { rename, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { db } from "../db";
import { datasetFiles } from "../repositories/datasetFiles/schema";
import { datasets } from "../repositories/datasets/unifiedSchema";
import { articles } from "../repositories/articles/schema";
import { eq, and } from "drizzle-orm";
import { storagePaths } from "../utils/paths/storagePaths";
import { logger } from "../utils/logger";

const OLD_PDF_ROOT = join(process.cwd(), "storage", "pdfs");

async function migratePdfPaths(): Promise<void> {
  logger.info(
    "Starting PDF path migration: storage/pdfs/{articleId} -> storage/dryad/{extId}",
  );

  const rows = await db
    .select({
      filename: datasetFiles.filename,
      datasetExtId: datasets.extId,
      articleId: articles.id,
    })
    .from(datasetFiles)
    .innerJoin(datasets, eq(datasets.id, datasetFiles.datasetId))
    .innerJoin(articles, eq(articles.id, datasets.articleId))
    .where(
      and(eq(datasetFiles.fileType, "pdf"), eq(datasetFiles.source, "dryad")),
    );

  logger.info(`Found ${rows.length} dryad PDF records to migrate`);

  let moved = 0;
  let skippedMissing = 0;
  let skippedExists = 0;
  let errors = 0;

  for (const row of rows) {
    const src = join(OLD_PDF_ROOT, row.articleId.toString(), row.filename);
    const destDir = storagePaths.dryadDataset(row.datasetExtId);
    const dest = join(destDir, row.filename);

    try {
      if (!existsSync(src)) {
        skippedMissing++;
        continue;
      }

      if (existsSync(dest)) {
        skippedExists++;
        continue;
      }

      await mkdir(destDir, { recursive: true });
      await rename(src, dest);
      moved++;
      logger.info(`Moved ${src} -> ${dest}`);
    } catch (err) {
      logger.error(
        `Failed to move ${src}: ${err instanceof Error ? err.message : String(err)}`,
      );
      errors++;
    }
  }

  logger.info(
    `Migration complete. Moved: ${moved}, Skipped (already at dest): ${skippedExists}, Skipped (src missing): ${skippedMissing}, Errors: ${errors}`,
  );
}

migratePdfPaths()
  .then(() => {
    logger.info("Done!");
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`Migration failed: ${error}`);
    process.exit(1);
  });
