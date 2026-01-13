import { Command } from "@commander-js/extra-typings";
import {
  getDatasetByExtId,
  upsertDataset,
  updateDatasetDownloadStatus,
  getDatasetsByDownloadStatus,
} from "../repositories/datasets/datasetsRepository";
import { upsertExcelFile } from "../repositories/excelFiles/excelFilesRepository";
import { upsertReadmeFile } from "../repositories/readmeFiles/readmeFilesRepository";
import { getDataset } from "../dryad/getDataset";
import { listFiles } from "../dryad/listFiles";
import { Dataset, ForbiddenDataset } from "../dryad/schemas";
import pMap from "p-map";
import { logger } from "../utils/logger";

// Type guard for forbidden datasets
function isForbiddenDataset(
  dataset: Dataset | ForbiddenDataset,
): dataset is ForbiddenDataset {
  return (
    "message" in dataset &&
    dataset.message ===
      "Identifier cannot be viewed. Either you lack permission to view it, or it is missing required elements."
  );
}

const program = new Command();

program
  .name("dryad-update")
  .description(
    "Update all datasets in the database with latest data from Dryad",
  )
  .option("--limit <number>", "Limit number of datasets to update", parseInt)
  .option("--extId <number>", "Update a specific dataset by extId", parseInt)
  .action(async (options) => {
    // Get datasets to update
    let datasets;
    if (options.extId) {
      const dataset = await getDatasetByExtId(options.extId);
      if (!dataset) {
        logger.error(
          `Dataset with extId ${options.extId} not found in database`,
        );
        return;
      }
      datasets = [dataset];
    } else {
      datasets = await getDatasetsByDownloadStatus("completed");
    }

    const datasetsToProcess = options.limit
      ? datasets.slice(0, options.limit)
      : datasets;

    logger.info(`Processing ${datasetsToProcess.length} datasets...`);

    let updatedDryadModificationDate = 0;
    let unchangedDryadModificationDate = 0;
    let forbidden = 0;
    let errors = 0;

    // Process each dataset sequentially (concurrency: 1, no rate limiting)
    await pMap(
      datasetsToProcess,
      async (existingDataset) => {
        try {
          // Fetch from API
          const apiDataset = await getDataset(existingDataset.extId);

          if (isForbiddenDataset(apiDataset)) {
            // Forbidden - mark status
            await updateDatasetDownloadStatus(
              existingDataset.extId,
              "api_forbidden",
            );
            logger.warn(`Dataset ${existingDataset.extId} is forbidden`);
            forbidden++;
            return;
          }

          // Extract latest version ID
          const versionUrlPath = apiDataset._links["stash:version"].href;
          const latestVersionId = Number(versionUrlPath.split("/").at(-1));

          const primaryArticleUrl = apiDataset.relatedWorks?.find(
            (work) => work.relationship === "primary_article",
          )?.identifier;

          const preprintArticleUrl = apiDataset.relatedWorks?.find(
            (work) => work.relationship === "preprint",
          )?.identifier;

          const regularArticleUrls = apiDataset.relatedWorks
            ?.filter((work) => work.relationship === "article")
            .map((work) => work.identifier);
          // If there is only one regular article URL, use it if no primary or preprint is found.
          const onlyRegularArticleUrl =
            regularArticleUrls?.length === 1 ? regularArticleUrls[0] : null;

          // Upsert dataset metadata (always)
          const { dataset, isNew } = await upsertDataset({
            extId: apiDataset.id,
            datasetDoi: apiDataset.identifier,
            originalFileSize: apiDataset.storageSize ?? null,
            title: apiDataset.title,
            abstract: apiDataset.abstract ?? null,
            usageNotes: apiDataset.usageNotes ?? null,
            primaryArticleUrl:
              primaryArticleUrl ??
              preprintArticleUrl ??
              onlyRegularArticleUrl ??
              null,
            journalIssn: apiDataset.relatedPublicationISSN ?? null,
            dryadPublicationDate:
              apiDataset.publicationDate ?? apiDataset.lastModificationDate,
            dryadLastModifiedDate: apiDataset.lastModificationDate,
            latestVersionId,
          });

          // Only fetch files if lastModifiedDate changed
          if (
            apiDataset.lastModificationDate !==
            existingDataset.dryadLastModifiedDate
          ) {
            const filesResponse = await listFiles({ version: latestVersionId });
            if (!("error" in filesResponse)) {
              const extDryadFiles = filesResponse._embedded["stash:files"];

              // Filter for excel files
              const extDryadExcelFiles = extDryadFiles
                .filter(
                  (file) =>
                    file.path.endsWith(".xlsx") || file.path.endsWith(".xls"),
                )
                .filter((file) => file._links["stash:download"]);

              // Upsert excel files
              for (const file of extDryadExcelFiles) {
                await upsertExcelFile({
                  dryadDatasetId: dataset.id,
                  extFileId: Number(
                    file._links["stash:download"]!.href.split("/").at(-2),
                  ),
                  filename: file.path,
                  size: file.size,
                });
              }

              // Find and upsert readme file
              const extDryadReadmeFile = extDryadFiles.find((file) =>
                /readme\.(txt|md)/i.test(file.path),
              );
              if (extDryadReadmeFile?._links["stash:download"]) {
                await upsertReadmeFile({
                  dryadDatasetId: dataset.id,
                  extFileId: Number(
                    extDryadReadmeFile._links["stash:download"].href
                      .split("/")
                      .at(-2),
                  ),
                  filename: extDryadReadmeFile.path,
                  size: extDryadReadmeFile.size,
                });
              }
            }
          }

          if (isNew) {
            logger.error(
              `Dataset was unexpectedly inserted instead of updated:${dataset.extId}: ${dataset.title}`,
            );
          } else {
            logger.info(`Updated dataset ${dataset.extId}: ${dataset.title}`);
          }

          // Check if anything actually changed by comparing dates
          if (
            apiDataset.lastModificationDate !==
            existingDataset.dryadLastModifiedDate
          ) {
            updatedDryadModificationDate++;
          } else {
            unchangedDryadModificationDate++;
          }
        } catch (error) {
          logger.error(
            `Error updating dataset ${existingDataset.extId}: ${error}`,
          );
          errors++;
        }
      },
      { concurrency: 1 },
    );

    logger.info(
      `Finished updating datasets. Updated lastModifiedDate: ${updatedDryadModificationDate}, Unchanged lastModifiedDate: ${unchangedDryadModificationDate}, Forbidden: ${forbidden}, Errors: ${errors}`,
    );
  });

program.parse();
