import { Command } from "@commander-js/extra-typings";
import { getDatasetsByDownloadStatus } from "../repositories/datasets/datasetsRepository";
import { getArticleFromDryadDataset } from "../openalex/getArticleFromDryadDataset";
import { logger } from "../utils/logger";
import { closeDb } from "../db";

const program = new Command();

program
  .name("openalex-connect-datasets")
  .description(
    "Connect downloaded datasets to an article from the OpenAlex API",
  )
  .action(async () => {
    try {
      const datasets = await getDatasetsByDownloadStatus("completed");
      const numDatasetsByResult = {
        found: 0,
        noneFound: 0,
        hasFullPdfUrl: 0,
      };
      console.log(`Found ${datasets.length} datasets to connect.`);
      for (const dataset of datasets) {
        const article = await getArticleFromDryadDataset(dataset);
        const fullPdfUrl = article?.locations?.find(
          (location) => location.pdf_url,
        )?.pdf_url;
        logger.info(`
dd: ${dataset.title} ->
 oa: ${article?.title}`);
        if (article) {
          numDatasetsByResult.found++;
          if (fullPdfUrl) {
            numDatasetsByResult.hasFullPdfUrl++;
          }
        } else {
          numDatasetsByResult.noneFound++;
        }
      }
      console.log(
        `Results: ${numDatasetsByResult.found} found (out of which ${numDatasetsByResult.hasFullPdfUrl} have PDFs available), ${numDatasetsByResult.noneFound} none found`,
      );
    } finally {
      await closeDb();
    }
  });

program.parse();
