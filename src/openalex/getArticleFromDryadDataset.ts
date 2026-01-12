import { DryadDatasetRow } from "../repositories/datasets/datasetsRepository";
import { logger } from "../utils/logger";
import { getArticleByDoi, getArticleByTitle } from "./searchArticle";
import { Work, WorkSearchResult } from "./schemas";

export async function getArticleFromDryadDataset(
  dataset: DryadDatasetRow,
): Promise<Work | WorkSearchResult | undefined> {
  if (dataset.primaryArticleUrl) {
    logger.debug(`Getting article by DOI: ${dataset.primaryArticleUrl}`);
    const article = await getArticleByDoi(dataset.primaryArticleUrl);
    if (!article) {
      logger.warn(
        `No article found by DOI: ${dataset.primaryArticleUrl}, giving up...`,
      );
      return undefined;
    }
    return article;
  }

  const titlePrefixesToRemove = [
    "Data from: ",
    "Dataset for: ",
    "Dataset from: ",
    "Data and code from: ",
    "Data for the paper ",
    "Raw data accompanying: ",
    "Raw data for ",
    "Data for ",
    "Dataset: ",
    "Supporting data: ",
  ];

  let articleTitleBestGuess = dataset.title;
  for (const prefix of titlePrefixesToRemove) {
    if (articleTitleBestGuess.startsWith(prefix)) {
      articleTitleBestGuess = articleTitleBestGuess.slice(prefix.length);
      break;
    }
  }
  logger.debug(`Getting article by title: ${articleTitleBestGuess}`);
  const article = await getArticleByTitle(articleTitleBestGuess);
  return article;
}
