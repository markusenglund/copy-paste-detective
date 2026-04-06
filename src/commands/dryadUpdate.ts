import { Command } from "@commander-js/extra-typings";
import {
  getDryadDatasetByExtId,
  upsertDryadDataset,
  upsertDryadDataFile,
  updateDryadDatasetDownloadStatus,
  getDryadDatasetsNotUpdatedSince,
} from "../repositories/datasets/unifiedDatasetsRepository";
import { getDataset } from "../dryad/getDataset";
import { listFiles } from "../dryad/listFiles";
import { Dataset, ForbiddenDataset } from "../dryad/schemas";
import pMap from "p-map";
import { logger } from "../utils/logger";
import { closeDb } from "../db";

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
    try {
      // Get datasets to update
      let datasets;
      if (options.extId) {
        const dataset = await getDryadDatasetByExtId(options.extId);
        if (!dataset) {
          logger.error(
            `Dataset with extId ${options.extId} not found in database`,
          );
          return;
        }
        datasets = [dataset];
      } else {
        datasets = await getDryadDatasetsNotUpdatedSince(
          new Date("2026-01-01"),
        );
      }

      const datasetsToProcess = options.limit
        ? datasets.slice(0, options.limit)
        : datasets;

      logger.info(`Processing ${datasetsToProcess.length} datasets...`);

      let updatedDryadModificationDate = 0;
      let unchangedDryadModificationDate = 0;
      let newPrimaryArticleUrl = 0;
      let forbidden = 0;
      let errors = 0;

      // Process each dataset sequentially (concurrency: 1, no rate limiting)
      await pMap(
        datasetsToProcess,
        async (existingDataset) => {
          const extIdNumeric = existingDataset.dryadDetails.extIdNumeric;
          try {
            // Fetch from API
            const apiDataset = await getDataset(extIdNumeric);

            if (isForbiddenDataset(apiDataset)) {
              // Forbidden - mark status
              await updateDryadDatasetDownloadStatus(
                extIdNumeric,
                "api_forbidden",
              );
              logger.warn(`Dataset ${extIdNumeric} is forbidden`);
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
            const { dataset, isNew } = await upsertDryadDataset({
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
              existingDataset.dryadDetails.dryadLastModifiedDate
            ) {
              const filesResponse = await listFiles({
                version: latestVersionId,
              });
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
                  await upsertDryadDataFile({
                    datasetId: dataset.id,
                    extFileId: Number(
                      file._links["stash:download"]!.href.split("/").at(-2),
                    ),
                    filename: file.path,
                    fileType: "excel",
                    size: file.size,
                  });
                }

                // Find and upsert readme file
                const extDryadReadmeFile = extDryadFiles.find((file) =>
                  /readme\.(txt|md)/i.test(file.path),
                );
                if (extDryadReadmeFile?._links["stash:download"]) {
                  await upsertDryadDataFile({
                    datasetId: dataset.id,
                    extFileId: Number(
                      extDryadReadmeFile._links["stash:download"].href
                        .split("/")
                        .at(-2),
                    ),
                    filename: extDryadReadmeFile.path,
                    fileType: "readme",
                    size: extDryadReadmeFile.size,
                  });
                }
              }
            }

            if (
              !existingDataset.dryadDetails.primaryArticleUrl &&
              dataset.doi
            ) {
              newPrimaryArticleUrl++;
            }

            if (isNew) {
              logger.error(
                `Dataset was unexpectedly inserted instead of updated:${extIdNumeric}: ${dataset.title}`,
              );
            } else {
              logger.info(`Updated dataset ${extIdNumeric}: ${dataset.title}`);
            }

            // Check if anything actually changed by comparing dates
            if (
              apiDataset.lastModificationDate !==
              existingDataset.dryadDetails.dryadLastModifiedDate
            ) {
              updatedDryadModificationDate++;
            } else {
              unchangedDryadModificationDate++;
            }
          } catch (error) {
            logger.error(`Error updating dataset ${extIdNumeric}: ${error}`);
            errors++;
          }
        },
        { concurrency: 2 },
      );

      logger.info(
        `Finished updating datasets. Updated lastModifiedDate: ${updatedDryadModificationDate}, Unchanged lastModifiedDate: ${unchangedDryadModificationDate}, New primaryArticleUrl: ${newPrimaryArticleUrl}, Forbidden: ${forbidden}, Errors: ${errors}`,
      );
    } finally {
      await closeDb();
    }
  });

program.parse();
