import { Command } from "@commander-js/extra-typings";
import {
  DryadDataset,
  getDatasetsByDownloadStatus,
} from "../repositories/datasets/datasetsRepository";
import { getArticleFromDryadDataset } from "../openalex/getArticleFromDryadDataset";
import { logger } from "../utils/logger";
import { closeDb } from "../db";
import { convertOpenalexArticle } from "../openalex/convertOpenalexArticle";
import { getJournalsByIssnMap } from "../repositories/journals/journalsRepository";
import { Journal } from "../repositories/journals/schema";
import { Work, WorkSearchResult } from "../openalex/schemas";
import { Article, ArticleInsert } from "../repositories/articles/schema";

const program = new Command();

program
  .name("openalex-connect-datasets")
  .description(
    "Connect downloaded datasets to an article from the OpenAlex API",
  )
  .action(async () => {
    try {
      const datasets = await getDatasetsByDownloadStatus("completed");
      const openalexArticles = await getArticlesFromDryadDatasets(datasets);
      const articles =
        await extractArticlesFromOpenAlexArticles(openalexArticles);

      console.log(`Found ${datasets.length} datasets to connect.`);

      console.log(
        `Results: ${openalexArticles.length} found (out of which ${numDatasetsByResult.hasFullPdfUrl} have PDFs available), ${numDatasetsByResult.articleNoteFound} none found`,
      );
    } finally {
      await closeDb();
    }
  });

async function extractArticlesFromOpenAlexArticles(
  openalexArticles: (Work | WorkSearchResult)[],
): Promise<ArticleInsert[]> {
  const journalByIssn = await getJournalsByIssnMap();
  const articles = openalexArticles.map((openalexArticle) => {
    let journal: Journal | undefined;
    const potentialIssns: string[] = [];
    if (openalexArticle.primary_location?.source?.issn) {
      potentialIssns.push(...openalexArticle.primary_location.source.issn);
    }
    if (openalexArticle.primary_location?.source?.issn_l) {
      potentialIssns.push(openalexArticle.primary_location.source.issn_l);
    }
    for (const issn of potentialIssns) {
      journal = journalByIssn.get(issn);
      if (journal) {
        break;
      }
    }

    if (!journal) {
      logger.warn(
        `Journal not found for OpenAlex article ID: ${openalexArticle.id}`,
      );
    }

    const article = convertOpenalexArticle(openalexArticle, journal?.id);
    return article;
  });
}

async function getArticlesFromDryadDatasets(
  datasets: DryadDataset[],
): Promise<(Work | WorkSearchResult)[]> {
  const openalexArticles: (Work | WorkSearchResult)[] = [];
  for (const dataset of datasets) {
    const openalexArticle = await getArticleFromDryadDataset(dataset);
    if (!openalexArticle) {
      continue;
    }
    openalexArticles.push(openalexArticle);
  }
}

program.parse();
