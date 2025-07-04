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
        const startTime = Date.now();
        await indexDatasetPage(page, alreadyIndexedDatasetIds);
        const elapsed = Date.now() - startTime;
        if (elapsed < 25000) {
          console.log(`Page ${page} indexed too fast, waiting to avoid 429...`);
          await new Promise((resolve) => setTimeout(resolve, 25000 - elapsed));
        }
        db.data.lastPageIndexed = page;
        await db.write();
      },
      { concurrency: 2 },
    );
    console.log(
      `Finished indexing ${pagesToIndex.length} pages, last indexed page: ${db.data.lastPageIndexed}`,
    );
  });

program.parse();
