import { Command } from "@commander-js/extra-typings";
import { getDatasetsByDownloadStatus } from "../repositories/datasets/datasetsRepository";
import { getArticleFromDryadDataset } from "../openalex/getArticleFromDryadDataset";
import { logger } from "../utils/logger";

const program = new Command();

program
  .name("openalex-connect-datasets")
  .description(
    "Connect downloaded datasets to an article from the OpenAlex API",
  )
  .action(async () => {
    const datasets = await getDatasetsByDownloadStatus("completed");
    const numDatasetsByResult = {
      found: 0,
      noneFound: 0,
    };
    console.log(`Found ${datasets.length} datasets to connect.`);
    for (const dataset of datasets
      .slice(0, 100)
      .filter((dataset) => !dataset.primaryArticleUrl)) {
      const article = await getArticleFromDryadDataset(dataset);
      logger.info(`
dd: ${dataset.title} ->
oa: ${article?.title}`);
      if (article) {
        numDatasetsByResult.found++;
      } else {
        numDatasetsByResult.noneFound++;
      }
    }
    console.log(
      `Results: ${numDatasetsByResult.found} found, ${numDatasetsByResult.noneFound} none found`,
    );
  });

program.parse();
