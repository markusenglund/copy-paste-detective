import { listDatasets } from "../dryad/listDatasets";
import { listFiles } from "../dryad/listFiles";
import { DryadDataset } from "./DryadDataset";
import { db } from "./datasetsDb";
import { Dataset, ForbiddenDataset } from "./schemas";
import Mutex from "p-mutex";

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
  console.log(`Fetched ${extDryadDatasets.length} datasets`);
  let numDatasetsWithExcelFiles = 0;
  for (const extDataset of extDryadDatasets) {
    if (alreadyIndexedDatasetIds.has(extDataset.id)) {
      console.log(`Dataset ${extDataset.id} already indexed, skipping...`);
      continue;
    }

    const versionUrlPath = extDataset._links["stash:version"].href;
    const latestVersionId = Number(versionUrlPath.split("/").at(-1));
    const filesResponse = await listFiles({ version: latestVersionId });
    const extDryadFiles = filesResponse._embedded["stash:files"];

    const extDryadExcelFiles = extDryadFiles
      .filter(
        (file) => file.path.endsWith(".xlsx") || file.path.endsWith(".xls"),
      )
      .filter((file) => {
        if (!file._links["stash:download"]) {
          console.warn(
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
    const readmeFile = extDryadReadmeFile?._links["stash:download"]
      ? {
          filename: extDryadReadmeFile.path,
          size: extDryadReadmeFile.size,
          fileId: Number(
            extDryadReadmeFile._links["stash:download"].href.split("/").at(-2),
          ),
        }
      : undefined;

    const dataset: DryadDataset = {
      extId: extDataset.id,
      dryadDoi: extDataset.identifier,
      originalFileSize: extDataset.storageSize,
      title: extDataset.title,
      abstract: extDataset.abstract,
      usageNotes: extDataset.usageNotes,
      primaryArticleLink:
        extDataset.relatedWorks?.find(
          (work) => work.relationship === "primary_article",
        )?.identifier || undefined,
      journalIssn: extDataset.relatedPublicationISSN,
      dryadPublicationDate: extDataset.publicationDate,
      dryadLastModifiedDate: extDataset.lastModificationDate,
      latestVersionId,
      excelFiles: extDryadExcelFiles.map((file) => ({
        filename: file.path,
        size: file.size,
        fileId: Number(file._links["stash:download"]!.href.split("/").at(-2)),
      })),
      readmeFile,
      indexedTimestamp: new Date().toISOString(),
      updatedTimestamp: new Date().toISOString(),
    };
    numDatasetsWithExcelFiles++;
    console.log(
      `Inserting dataset ${dataset.extId} with ${dataset.excelFiles.length} Excel files: ${dataset.excelFiles.map((file) => file.filename).join(", ")} Title: '${dataset.title}'`,
    );
    db.data.datasets.push(dataset);
    await db.write();
  }

  console.log(
    `Finished indexing page ${currentPage} out of ${Math.ceil(data.total / data.count)}. ${numDatasetsWithExcelFiles} datasets with Excel files found out of ${data.count}.`,
  );
}
