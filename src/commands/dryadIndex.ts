import { Command } from "@commander-js/extra-typings";
import { listDatasets } from "../dryad/listDatasets";
import { listFiles } from "../dryad/listFiles";
import { JSONFilePreset } from "lowdb/node";

type DryadExcelFile = {
  filename: string;
  size: number;
  fileId: number;
};

type DryadDataset = {
  extId: number;
  dryadDoi: string;
  originalFileSize: number;
  title: string;
  abstract: string;
  primaryArticleLink?: string;
  journalIssn: string;
  dryadPublicationDate: string;
  dryadLastModifiedDate: string;
  latestVersionId: number;
  excelFiles: DryadExcelFile[];
  indexedTimestamp: string;
  updatedTimestamp: string;
};
type Data = {
  datasets: DryadDataset[];
  lastPageIndexed: number | null;
};

const defaultData: Data = {
  datasets: [],
  lastPageIndexed: null,
};

const program = new Command();

program
  .name("dryad-download")
  .description("Fetch metadata about excel files from datadryad.org")
  .version("0.1.0")
  .action(async () => {
    const db = await JSONFilePreset("data/dryad.json", defaultData);
    const alreadyIndexedDatasetIds = new Set(
      db.data.datasets.map((dataset) => dataset.extId),
    );
    const data = await listDatasets({ page: 1, perPage: 20 });
    const extDryadDatasets = data._embedded["stash:datasets"];
    console.log(`Fetched ${extDryadDatasets.length} datasets`);

    for (const extDataset of extDryadDatasets) {
      if (alreadyIndexedDatasetIds.has(extDataset.id)) {
        console.log(`Dataset ${extDataset.id} already indexed, skipping...`);
        continue;
      }

      const versionUrlPath = extDataset._links["stash:version"].href;
      const latestVersionId = Number(versionUrlPath.split("/").at(-1));
      const filesResponse = await listFiles({ version: latestVersionId });
      const extDryadFiles = filesResponse._embedded["stash:files"];

      const extDryadExcelFiles = extDryadFiles.filter(
        (file) => file.path.endsWith(".xlsx") || file.path.endsWith(".xls"),
      );
      if (extDryadExcelFiles.length === 0) {
        console.log(
          `Dataset ${extDataset.id} doesn't have any Excel files, skipping...`,
        );
        continue;
      }

      const dataset: DryadDataset = {
        extId: extDataset.id,
        dryadDoi: extDataset.identifier,
        originalFileSize: extDataset.storageSize,
        title: extDataset.title,
        abstract: extDataset.abstract,
        primaryArticleLink:
          extDataset.relatedWorks.find(
            (work) => work.relationship === "primary_article",
          )?.identifier || undefined,
        journalIssn: extDataset.relatedPublicationISSN,
        dryadPublicationDate: extDataset.publicationDate,
        dryadLastModifiedDate: extDataset.lastModificationDate,
        latestVersionId,
        excelFiles: extDryadExcelFiles.map((file) => ({
          filename: file.path,
          size: file.size,
          fileId: Number(file._links["stash:download"].href.split("/").at(-2)),
        })),
        indexedTimestamp: new Date().toISOString(),
        updatedTimestamp: new Date().toISOString(),
      };
      console.log(
        `Inserting dataset ${dataset.extId} with ${dataset.excelFiles.length} Excel files: ${dataset.excelFiles.map((file) => file.filename).join(", ")} Title: '${dataset.title}'`,
      );
      db.data.datasets.push(dataset);
      await db.write();
    }
  });

program.parse();

// .filter((file) => {
//   if (file.size < 100_000_000) {
//     return true;
//   }
//   console.warn(
//     `File ${file.path} (${formatSize(file.size)}) from dataset ${dataset.id} skipped due to exceeding size limit`,
//   );
//   return false;
// });

// for (const excelFile of excelFiles) {
//   const fileId = Number(
//     excelFile._links["stash:download"].href.split("/").at(-2),
//   );
//   await downloadFile({
//     fileId,
//     filename: excelFile.path,
//     datasetId: dataset.id,
//   });
// }
