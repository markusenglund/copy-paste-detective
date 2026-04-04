import { Command } from "@commander-js/extra-typings";
import pMap from "p-map";
import {
  PmcDataset,
  getPmcDatasetsWithoutArticles,
  getPmcDatasetByExtPmcId,
  updatePmcDatasetArticleId,
} from "../repositories/pmcDatasets/pmcDatasetsRepository";
import { getArticleFromPmcDataset } from "../openalex/getArticleFromPmcDataset";
import { logger } from "../utils/logger";
import { closeDb } from "../db";
import { convertOpenalexArticle } from "../openalex/convertOpenalexArticle";
import { getJournalsByIssnMap } from "../repositories/journals/journalsRepository";
import { Journal } from "../repositories/journals/schema";
import { Work, WorkSearchResult } from "../openalex/schemas";
import {
  Article,
  ArticleAuthorInsert,
  ArticleFunderInsert,
  ArticleInsert,
} from "../repositories/articles/schema";
import { Author, AuthorInsert } from "../repositories/authors/schema";
import {
  Institution,
  InstitutionInsert,
} from "../repositories/institutions/schema";
import { Funder, FunderInsert } from "../repositories/funders/schema";
import {
  bulkUpsertArticles,
  bulkUpsertArticleAuthors,
  bulkInsertArticleFunders,
} from "../repositories/articles/articlesRepository";
import { bulkUpsertAuthors } from "../repositories/authors/authorsRepository";
import { bulkUpsertInstitutions } from "../repositories/institutions/institutionsRepository";
import { bulkUpsertFunders } from "../repositories/funders/fundersRepository";
import { uniqBy } from "lodash-es";

type OpenAlexArticleWithDataset = {
  dataset: PmcDataset;
  openalexArticle: Work | WorkSearchResult;
};

const program = new Command();

program
  .name("openalex-connect-pmc")
  .description("Connect PMC datasets to an article from the OpenAlex API")
  .option("--pmcId <string>", "Connect a specific dataset by PMC ID")
  .option(
    "--limit <number>",
    "Limit the number of datasets to process",
    parseInt,
  )
  .action(async (options) => {
    try {
      let datasets: PmcDataset[];

      if (options.pmcId) {
        const dataset = await getPmcDatasetByExtPmcId(options.pmcId);
        if (!dataset) {
          logger.error(`PMC dataset with extPmcId ${options.pmcId} not found`);
          return;
        }
        datasets = [dataset];
        logger.info(`Processing PMC dataset with extPmcId ${options.pmcId}...`);
      } else {
        datasets = await getPmcDatasetsWithoutArticles(options.limit);
        logger.info(
          `Found ${datasets.length} PMC datasets to search OpenAlex for...`,
        );
      }

      const CHUNK_SIZE = 100;
      let totalArticlesFound = 0;

      for (let i = 0; i < datasets.length; i += CHUNK_SIZE) {
        const chunk = datasets.slice(i, i + CHUNK_SIZE);
        const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
        const totalChunks = Math.ceil(datasets.length / CHUNK_SIZE);
        logger.info(
          `Processing chunk ${chunkNumber}/${totalChunks} (datasets ${i + 1}-${i + chunk.length} of ${datasets.length})`,
        );

        const articlesWithDatasets = await getArticlesFromPmcDatasets(chunk);
        totalArticlesFound += articlesWithDatasets.length;
        logger.info(
          `Found ${articlesWithDatasets.length} OpenAlex articles from ${chunk.length} datasets in this chunk`,
        );

        if (articlesWithDatasets.length === 0) {
          logger.info(`No articles found in this chunk, skipping DB upserts`);
          continue;
        }

        const articles =
          await extractArticlesFromOpenAlexArticles(articlesWithDatasets);
        const { authors, institutions, funders } =
          extractArticleMetadataFromOpenAlexArticles(articlesWithDatasets);

        logger.info(
          `Extracted: ${articles.length} articles, ${authors.length} authors, ${institutions.length} institutions, ${funders.length} funders`,
        );

        const insertedAuthors = await bulkUpsertAuthors(authors);
        logger.info(`Upserted ${insertedAuthors.length} authors`);

        const insertedInstitutions = await bulkUpsertInstitutions(institutions);
        logger.info(`Upserted ${insertedInstitutions.length} institutions`);

        const insertedFunders = await bulkUpsertFunders(funders);
        logger.info(`Upserted ${insertedFunders.length} funders`);

        const insertedArticles = await bulkUpsertArticles(articles);
        logger.info(`Upserted ${insertedArticles.length} articles`);

        await linkPmcDatasetsToArticles(articlesWithDatasets, insertedArticles);
        logger.info(
          `Linked ${articlesWithDatasets.length} PMC datasets to articles`,
        );

        const { articleAuthors, articleFunders } =
          extractJunctionTablesDataFromOpenalexArticles({
            articlesWithDatasets,
            insertedAuthors,
            insertedInstitutions,
            insertedFunders,
            insertedArticles,
          });

        const insertedArticleAuthors =
          await bulkUpsertArticleAuthors(articleAuthors);
        logger.info(
          `Upserted ${insertedArticleAuthors.length} article-authors`,
        );

        const insertedArticleFunders =
          await bulkInsertArticleFunders(articleFunders);
        logger.info(
          `Inserted ${insertedArticleFunders.length} (out of ${articleFunders.length} found) article-funders`,
        );

        logger.info(
          `Chunk ${chunkNumber}/${totalChunks} complete. Running total: ${totalArticlesFound} articles found from ${i + chunk.length} datasets`,
        );
      }
    } finally {
      await closeDb();
    }
  });

async function linkPmcDatasetsToArticles(
  articlesWithDatasets: OpenAlexArticleWithDataset[],
  insertedArticles: Article[],
): Promise<void> {
  const articleByOpenalexId = new Map(
    insertedArticles.map((article) => [article.extOpenalexId, article]),
  );
  await pMap(
    articlesWithDatasets,
    async ({ dataset, openalexArticle }) => {
      const article = articleByOpenalexId.get(openalexArticle.id);
      if (article) {
        await updatePmcDatasetArticleId(dataset.id, article.id);
      }
    },
    { concurrency: 5 },
  );
}

function extractJunctionTablesDataFromOpenalexArticles(params: {
  articlesWithDatasets: OpenAlexArticleWithDataset[];
  insertedAuthors: Author[];
  insertedInstitutions: Institution[];
  insertedFunders: Funder[];
  insertedArticles: Article[];
}): {
  articleAuthors: ArticleAuthorInsert[];
  articleFunders: ArticleFunderInsert[];
} {
  const authorRecordByOrcid = new Map(
    params.insertedAuthors.map((author) => [author.orcid, author]),
  );
  const institutionRecordByRorId = new Map(
    params.insertedInstitutions.map((institution) => [
      institution.rorId,
      institution,
    ]),
  );
  const funderRecordByRorId = new Map(
    params.insertedFunders.map((funder) => [funder.rorId, funder]),
  );
  const articleRecordByOpenalexId = new Map(
    params.insertedArticles.map((article) => [article.extOpenalexId, article]),
  );

  const articleAuthors: ArticleAuthorInsert[] = [];
  const articleFunders: ArticleFunderInsert[] = [];
  for (const { openalexArticle } of params.articlesWithDatasets) {
    const articleRecord = articleRecordByOpenalexId.get(openalexArticle.id)!;

    const seenAuthorOrcids = new Set<string>();
    for (const {
      author,
      institutions,
      author_position,
    } of openalexArticle.authorships) {
      if (author.orcid && !seenAuthorOrcids.has(author.orcid)) {
        const authorRecord = authorRecordByOrcid.get(author.orcid)!;
        const [firstInstitution] = institutions;
        const institutionId = firstInstitution?.ror
          ? institutionRecordByRorId.get(firstInstitution.ror)?.id
          : undefined;

        const articleAuthor: ArticleAuthorInsert = {
          articleId: articleRecord.id,
          authorId: authorRecord.id,
          authorPosition: author_position,
          institutionId,
        };
        articleAuthors.push(articleAuthor);
        seenAuthorOrcids.add(author.orcid);
      }
    }

    for (const funder of openalexArticle.funders) {
      if (funder.ror) {
        const funderRecord = funderRecordByRorId.get(funder.ror)!;
        const articleFunder: ArticleFunderInsert = {
          articleId: articleRecord.id,
          funderId: funderRecord.id,
        };
        articleFunders.push(articleFunder);
      }
    }
  }

  const uniqueArticleAuthors = uniqBy(
    articleAuthors,
    (articleAuthor) => `${articleAuthor.articleId}-${articleAuthor.authorId}`,
  );
  const uniqueArticleFunders = uniqBy(
    articleFunders,
    (articleFunder) => `${articleFunder.articleId}-${articleFunder.funderId}`,
  );

  return {
    articleAuthors: uniqueArticleAuthors,
    articleFunders: uniqueArticleFunders,
  };
}

async function extractArticlesFromOpenAlexArticles(
  articlesWithDatasets: OpenAlexArticleWithDataset[],
): Promise<ArticleInsert[]> {
  const journalByIssn = await getJournalsByIssnMap();
  const articles = articlesWithDatasets.map(({ openalexArticle }) => {
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
  const uniqueArticles = uniqBy(articles, "doi");
  return uniqueArticles;
}

function extractArticleMetadataFromOpenAlexArticles(
  articlesWithDatasets: OpenAlexArticleWithDataset[],
): {
  authors: AuthorInsert[];
  institutions: InstitutionInsert[];
  funders: FunderInsert[];
} {
  const authorByOrcid = new Map<string, AuthorInsert>();
  const institutionByRorId = new Map<string, InstitutionInsert>();
  const funderByRorId = new Map<string, FunderInsert>();

  for (const { openalexArticle } of articlesWithDatasets) {
    for (const { author, institutions } of openalexArticle.authorships) {
      if (author.orcid && !authorByOrcid.has(author.orcid)) {
        authorByOrcid.set(author.orcid, {
          extOpenalexId: author.id,
          displayName: author.display_name,
          orcid: author.orcid,
        });
      }
      const [firstInstitution] = institutions;
      if (firstInstitution?.ror) {
        institutionByRorId.set(firstInstitution.ror, {
          openalexExtId: firstInstitution.id,
          rorId: firstInstitution.ror,
          displayName: firstInstitution.display_name,
          countryCode: firstInstitution.country_code,
        });
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

async function getArticlesFromPmcDatasets(
  datasets: PmcDataset[],
): Promise<OpenAlexArticleWithDataset[]> {
  const results = await pMap(
    datasets,
    async (dataset) => {
      const openalexArticle = await getArticleFromPmcDataset(dataset);
      if (openalexArticle) {
        return { dataset, openalexArticle };
      }
      return undefined;
    },
    { concurrency: 2 },
  );
  return results.filter(
    (r): r is OpenAlexArticleWithDataset => r !== undefined,
  );
}

program.parse();
