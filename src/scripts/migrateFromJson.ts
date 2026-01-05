import fs from "fs";
import path from "path";
import { db } from "../db";
import {
  dryadDatasets,
  dryadExcelFiles,
  dryadReadmeFiles,
  dryadIndexingState,
} from "../repositories";
import { DryadDataset } from "../dryad/DryadDataset";
import { logger } from "../utils/logger";

type JsonData = {
  lastPageIndexed: number | null;
  datasets: DryadDataset[];
};

/**
 * Maps old dataset status to new download_status enum
 */
function mapDatasetStatus(
  oldStatus: DryadDataset["status"],
): "not_started" | "in_progress" | "failed" | "completed" {
  switch (oldStatus) {
    case "indexed":
      return "not_started";
    case "downloaded":
    case "analyzed":
    case "evaluated":
      return "completed";
    case "failed":
      return "failed";
    default:
      return "not_started";
  }
}

/**
 * Maps old file status to new download_status enum
 */
function mapFileStatus(
  oldStatus: "downloaded" | undefined,
): "not_started" | "completed" {
  return oldStatus === "downloaded" ? "completed" : "not_started";
}

async function migrateFromJson() {
  const jsonPath = path.join(
    process.cwd(),
    "data",
    "dryad",
    "datasets.json",
  );

  logger.info(`Reading JSON data from ${jsonPath}...`);
  const jsonContent = fs.readFileSync(jsonPath, "utf-8");
  const data: JsonData = JSON.parse(jsonContent);

  logger.info(`Found ${data.datasets.length} datasets to migrate.`);
  logger.info(`lastPageIndexed: ${data.lastPageIndexed}`);

  // Migrate lastPageIndexed
  if (data.lastPageIndexed !== null) {
    logger.info("Migrating indexing state...");
    await db.insert(dryadIndexingState).values({
      lastPageIndexed: data.lastPageIndexed,
    });
  }

  // Migrate datasets in batches
  const batchSize = 100;
  let processedCount = 0;

  for (let i = 0; i < data.datasets.length; i += batchSize) {
    const batch = data.datasets.slice(i, i + batchSize);

    for (const dataset of batch) {
      // Insert dataset
      const [insertedDataset] = await db
        .insert(dryadDatasets)
        .values({
          extId: dataset.extId,
          datasetDoi: dataset.dryadDoi,
          originalFileSize: dataset.originalFileSize ?? null,
          title: dataset.title,
          abstract: dataset.abstract ?? null,
          usageNotes: dataset.usageNotes ?? null,
          primaryArticleUrl: dataset.primaryArticleLink ?? null,
          journalIssn: dataset.journalIssn ?? null,
          dryadPublicationDate: dataset.dryadPublicationDate,
          dryadLastModifiedDate: dataset.dryadLastModifiedDate,
          latestVersionId: dataset.latestVersionId,
          downloadStatus: mapDatasetStatus(dataset.status),
          indexedTimestamp: new Date(dataset.indexedTimestamp),
          updatedTimestamp: new Date(dataset.updatedTimestamp),
        })
        .returning({ id: dryadDatasets.id });

      // Insert excel files
      if (dataset.excelFiles.length > 0) {
        await db.insert(dryadExcelFiles).values(
          dataset.excelFiles.map((file) => ({
            dryadDatasetId: insertedDataset.id,
            extFileId: file.fileId,
            filename: file.filename,
            size: file.size,
            downloadStatus: mapFileStatus(file.status),
          })),
        );
      }

      // Insert readme file if present
      if (dataset.readmeFile) {
        await db.insert(dryadReadmeFiles).values({
          dryadDatasetId: insertedDataset.id,
          extFileId: dataset.readmeFile.fileId,
          filename: dataset.readmeFile.filename,
          size: dataset.readmeFile.size,
          downloadStatus: mapFileStatus(dataset.readmeFile.status),
        });
      }
    }

    processedCount += batch.length;
    logger.info(
      `Migrated ${processedCount}/${data.datasets.length} datasets...`,
    );
  }

  logger.info("Migration completed successfully!");
}

migrateFromJson()
  .then(() => {
    logger.info("Done!");
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`Migration failed: ${error}`);
    process.exit(1);
  });

