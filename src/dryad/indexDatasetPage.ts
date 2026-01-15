import { listDatasets } from "../dryad/listDatasets";
import { listFiles } from "../dryad/listFiles";
import { upsertDataset } from "../repositories/datasets/datasetsRepository";
import { upsertExcelFile } from "../repositories/excelFiles/excelFilesRepository";
import { upsertReadmeFile } from "../repositories/readmeFiles/readmeFilesRepository";
import { Dataset, ForbiddenDataset } from "./schemas";
import Mutex from "p-mutex";
import { logger } from "../utils/logger";

const listDatasetsMutex = new Mutex();

export async function indexDatasetPage(
  currentPage: number,
  alreadyIndexedDatasetIds: Set<number>,
): Promise<void> {
  const data = await listDatasetsMutex.withLock(() =>
    listDatasets({ page: currentPage, perPage: 20 }),
  );
  const extDryadDatasets = data._embedded["stash:datasets"].filter(
    (dataset: Dataset | ForbiddenDataset): dataset is Dataset =>
      !(
        "message" in dataset &&
        dataset.message ===
          "Identifier cannot be viewed. Either you lack permission to view it, or it is missing required elements."
      ),
  );
  logger.info(`Fetched ${extDryadDatasets.length} datasets`);
  let numDatasetsWithExcelFiles = 0;
  for (const extDataset of extDryadDatasets) {
    if (alreadyIndexedDatasetIds.has(extDataset.id)) {
      logger.info(`Dataset ${extDataset.id} already indexed, skipping...`);
      continue;
    }

    const versionUrlPath = extDataset._links["stash:version"].href;
    const latestVersionId = Number(versionUrlPath.split("/").at(-1));
    const filesResponse = await listFiles({ version: latestVersionId });
    if ("error" in filesResponse) {
      continue;
    }

    const extDryadFiles = filesResponse._embedded["stash:files"];

    const extDryadExcelFiles = extDryadFiles
      .filter(
        (file) => file.path.endsWith(".xlsx") || file.path.endsWith(".xls"),
      )
      .filter((file) => {
        if (!file._links["stash:download"]) {
          logger.warn(
            `File ${file.path} from dataset ${extDataset.id} has no download link, skipping...`,
          );
          return false;
        }
        return true;
      });
    if (extDryadExcelFiles.length === 0) {
      continue;
    }

    const extDryadReadmeFile = extDryadFiles.find((file) =>
      /readme\.(txt|md)/i.test(file.path),
    );

    const primaryArticleUrl = extDataset.relatedWorks?.find(
      (work) => work.relationship === "primary_article",
    )?.identifier;

    const preprintArticleUrl = extDataset.relatedWorks?.find(
      (work) => work.relationship === "preprint",
    )?.identifier;

    const regularArticleUrls = extDataset.relatedWorks
      ?.filter((work) => work.relationship === "article")
      .map((work) => work.identifier);
    // If there is only one regular article URL, use it if no primary or preprint is found.
    const onlyRegularArticleUrl =
      regularArticleUrls?.length === 1 ? regularArticleUrls[0] : null;

    // Upsert the dataset
    const { dataset: upsertedDataset, isNew } = await upsertDataset({
      extId: extDataset.id,
      datasetDoi: extDataset.identifier,
      originalFileSize: extDataset.storageSize ?? null,
      title: extDataset.title,
      abstract: extDataset.abstract ?? null,
      usageNotes: extDataset.usageNotes ?? null,
      primaryArticleUrl:
        primaryArticleUrl ??
        preprintArticleUrl ??
        onlyRegularArticleUrl ??
        null,
      journalIssn: extDataset.relatedPublicationISSN ?? null,
      dryadPublicationDate:
        extDataset.publicationDate ?? extDataset.lastModificationDate,
      dryadLastModifiedDate: extDataset.lastModificationDate,
      latestVersionId,
    });

    // Upsert excel files
    for (const file of extDryadExcelFiles) {
      await upsertExcelFile({
        dryadDatasetId: upsertedDataset.id,
        extFileId: Number(
          file._links["stash:download"]!.href.split("/").at(-2),
        ),
        filename: file.path,
        size: file.size,
      });
    }

    // Upsert readme file if present
    if (extDryadReadmeFile?._links["stash:download"]) {
      await upsertReadmeFile({
        dryadDatasetId: upsertedDataset.id,
        extFileId: Number(
          extDryadReadmeFile._links["stash:download"].href.split("/").at(-2),
        ),
        filename: extDryadReadmeFile.path,
        size: extDryadReadmeFile.size,
      });
    }

    numDatasetsWithExcelFiles++;
    const action = isNew ? "Inserted" : "Updated";
    logger.info(
      `${action} dataset ${upsertedDataset.extId} with ${extDryadExcelFiles.length} Excel files: ${extDryadExcelFiles.map((file) => file.path).join(", ")} Title: '${upsertedDataset.title}'`,
    );
  }

  logger.info(
    `Finished indexing page ${currentPage} out of ${Math.ceil(data.total / data.count)}. ${numDatasetsWithExcelFiles} datasets with Excel files found out of ${data.count}.`,
  );
}
