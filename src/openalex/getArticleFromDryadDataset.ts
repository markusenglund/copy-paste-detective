import { DryadDatasetWithFiles } from "../repositories/datasets/unifiedDatasetsRepository";
import { logger } from "../utils/logger";
import {
  getArticleByAbstract,
  getArticleByDoi,
  getArticleByTitle,
} from "./searchArticle";
import { Work, WorkSearchResult } from "./schemas";

export async function getArticleFromDryadDataset(
  dataset: DryadDatasetWithFiles,
): Promise<Work | WorkSearchResult | undefined> {
  let article: Work | WorkSearchResult | undefined;
  const primaryArticleUrl = dataset.dryadDetails.primaryArticleUrl;
  if (primaryArticleUrl) {
    logger.debug(`Getting article by DOI: '${primaryArticleUrl}'`);
    article = await getArticleByDoi(primaryArticleUrl);
    if (article) {
      return article;
    }
    logger.warn(
      `No article found by DOI: '${primaryArticleUrl}'. Most likely the DOI is wrong, so moving on to other methods...`,
    );
  }

  const titlePrefixesToRemove = [
    "Data from: ",
    "Data for: ",
    "Dataset from: ",
    "Dataset for: ",
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
  logger.debug(`Getting article by title: '${articleTitleBestGuess}'`);
  article = await getArticleByTitle(articleTitleBestGuess);
  if (article) {
    return article;
  }

  if (dataset.abstract) {
    article = await getArticleByAbstract(dataset.abstract);
    return article;
  }
  return undefined;
}
