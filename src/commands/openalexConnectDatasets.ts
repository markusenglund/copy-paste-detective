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
import { ArticleInsert } from "../repositories/articles/schema";
import { AuthorInsert } from "../repositories/authors/schema";
import { InstitutionInsert } from "../repositories/institutions/schema";
import { FunderInsert } from "../repositories/funders/schema";

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
      const { authors, institutions, funders } =
        extractArticleMetadataFromOpenAlexArticles(openalexArticles);

      console.log(`Found ${datasets.length} datasets to connect.`);

      console.log(
        `Results: ${articles.length} articles to be created from ${openalexArticles.length} oa articles found out of ${datasets.length} datasets.`,
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

    const { article } = convertOpenalexArticle(openalexArticle, journal?.id);
    return article;
  });
  return articles;
}

function extractArticleMetadataFromOpenAlexArticles(
  openalexArticles: (Work | WorkSearchResult)[],
): {
  authors: AuthorInsert[];
  institutions: InstitutionInsert[];
  funders: FunderInsert[];
} {
  const authorByOrcid = new Map<string, AuthorInsert>();
  const institutionByRorId = new Map<string, InstitutionInsert>();
  const funderByRorId = new Map<string, FunderInsert>();

  for (const openalexArticle of openalexArticles) {
    for (const { author, institutions } of openalexArticle.authorships) {
      if (author.orcid && !authorByOrcid.has(author.orcid)) {
        authorByOrcid.set(author.orcid, {
          extOpenalexId: author.id,
          displayName: author.display_name,
          orcid: author.orcid,
        });
      }

      for (const institution of institutions) {
        if (institution.ror) {
          institutionByRorId.set(institution.ror, {
            openalexExtId: institution.id,
            rorId: institution.ror,
            displayName: institution.display_name,
            countryCode: institution.country_code,
          });
        }
      }
    }

    for (const funder of openalexArticle.funders) {
      if (funder.ror) {
        funderByRorId.set(funder.ror, {
          openalexExtId: funder.id,
          rorId: funder.ror,
          displayName: funder.display_name,
        });
      }
    }
  }

  const authors = Array.from(authorByOrcid.values());
  const institutions = Array.from(institutionByRorId.values());
  const funders = Array.from(funderByRorId.values());

  return { authors, institutions, funders };
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

  return openalexArticles;
}

program.parse();
