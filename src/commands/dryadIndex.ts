import { Command } from "@commander-js/extra-typings";
import { getAllDryadExtIds } from "../repositories/datasets/unifiedDatasetsRepository";
import {
  getLastPageIndexed,
  setLastPageIndexed,
} from "../repositories/indexingState/indexingStateRepository";
import { indexDatasetPage } from "../dryad/indexDatasetPage";
import { listDatasets } from "../dryad/listDatasets";
import pMap from "p-map";
import { logger } from "../utils/logger";
import { closeDb } from "../db";

const program = new Command();

program
  .name("dryad-index")
  .description("Fetch metadata about excel files from datadryad.org")
  .version("0.1.0")
  .action(async () => {
    try {
      const alreadyIndexedDatasetIds = await getAllDryadExtIds();
      const lastPageIndexed = await getLastPageIndexed();

      // Check how many pages we have left to index
      const firstDatasetPage = await listDatasets({ page: 1, perPage: 20 });
      const totalPages = Math.ceil(
        firstDatasetPage.total / firstDatasetPage.count,
      );
      const pagesToIndex = Array.from(
        { length: totalPages - (lastPageIndexed ?? 0) },
        (_, i) => (lastPageIndexed ?? 0) + 1 + i,
      );
      const firstPageToIndex = lastPageIndexed ? lastPageIndexed + 1 : 1;
      logger.info(`Starting indexing from page ${firstPageToIndex}`);
      await pMap(
        pagesToIndex,
        async (page) => {
          const startTime = Date.now();
          await indexDatasetPage(page, alreadyIndexedDatasetIds);
          const elapsed = Date.now() - startTime;
          if (elapsed < 25000) {
            logger.info(
              `Page ${page} indexed too fast, waiting to avoid 429...`,
            );
            await new Promise((resolve) =>
              setTimeout(resolve, 25000 - elapsed),
            );
          }
          await setLastPageIndexed(page);
        },
        { concurrency: 2 },
      );
      const finalLastPageIndexed = await getLastPageIndexed();
      logger.info(
        `Finished indexing ${pagesToIndex.length} pages, last indexed page: ${finalLastPageIndexed}`,
      );
    } finally {
      await closeDb();
    }
  });

program.parse();
