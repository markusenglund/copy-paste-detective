import { DatasetRow as PmcDataset } from "../repositories/datasets/unifiedDatasetsRepository";
import { logger } from "../utils/logger";
import { getArticleByDoi, getArticleByTitle } from "./searchArticle";
import { Work, WorkSearchResult } from "./schemas";

export async function getArticleFromPmcDataset(
  dataset: PmcDataset,
): Promise<Work | WorkSearchResult | undefined> {
  if (dataset.doi) {
    logger.debug(`Getting article by DOI: '${dataset.doi}'`);
    const doi = dataset.doi.startsWith("http")
      ? dataset.doi
      : `doi:${dataset.doi}`;
    const article = await getArticleByDoi(doi);
    if (article) {
      return article;
    }
    logger.warn(
      `No article found by DOI: '${dataset.doi}'. Falling back to title search...`,
    );
  }

  logger.debug(`Getting article by title: '${dataset.title}'`);
  return getArticleByTitle(dataset.title);
}
