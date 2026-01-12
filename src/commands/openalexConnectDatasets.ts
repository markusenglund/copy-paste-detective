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
    console.log(`Found ${datasets.length} datasets to connect.`);
    for (const dataset of datasets.slice(0, 100)) {
      const article = await getArticleFromDryadDataset(dataset);
      logger.info(`${dataset.title} -> ${article?.title}`);
    }
  });

program.parse();
