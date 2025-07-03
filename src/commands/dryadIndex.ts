import { Command } from "@commander-js/extra-typings";
import { db } from "../dryad/datasetsDb";
import { indexDatasetPage } from "../dryad/indexDatasetPage";
import { listDatasets } from "../dryad/listDatasets";
import pMap from "p-map";

const program = new Command();

program
  .name("dryad-index")
  .description("Fetch metadata about excel files from datadryad.org")
  .version("0.1.0")
  .action(async () => {
    const alreadyIndexedDatasetIds = new Set(
      db.data.datasets.map((dataset) => dataset.extId),
    );

    // Check how many pages we have left to index
    const firstDatasetPage = await listDatasets({ page: 1, perPage: 20 });
    const totalPages = Math.ceil(
      firstDatasetPage.total / firstDatasetPage.count,
    );
    const pagesToIndex = Array.from(
      { length: totalPages - (db.data.lastPageIndexed ?? 0) },
      (_, i) => (db.data.lastPageIndexed ?? 0) + 1 + i,
    );
    const firstPageToIndex = db.data.lastPageIndexed
      ? db.data.lastPageIndexed + 1
      : 1;
    console.log(`Starting indexing from page ${firstPageToIndex}`);
    await pMap(
      pagesToIndex,
      async (page) => {
        await indexDatasetPage(page, alreadyIndexedDatasetIds);
        db.data.lastPageIndexed = page;
        await db.write();
      },
      { concurrency: 3 },
    );
    console.log(
      `Finished indexing ${pagesToIndex.length} pages, last indexed page: ${db.data.lastPageIndexed}`,
    );
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
