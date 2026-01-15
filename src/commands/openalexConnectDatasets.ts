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
  bulkUpsertArticleFunders,
} from "../repositories/articles/articlesRepository";
import { bulkUpsertAuthors } from "../repositories/authors/authorsRepository";
import { bulkUpsertInstitutions } from "../repositories/institutions/institutionsRepository";
import { bulkUpsertFunders } from "../repositories/funders/fundersRepository";

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
      console.log(`Upserted ${insertedArticles.length} articles`);

      const { articleAuthors, articleFunders } =
        extractJunctionTablesDataFromOpenalexArticles({
          openalexArticles,
          insertedAuthors,
          insertedInstitutions,
          insertedFunders,
          insertedArticles,
        });

      const insertedArticleAuthors =
        await bulkUpsertArticleAuthors(articleAuthors);
      logger.info(`Upserted ${insertedArticleAuthors.length} article-authors`);

      const insertedArticleFunders =
        await bulkUpsertArticleFunders(articleFunders);
      logger.info(`Upserted ${insertedArticleFunders.length} article-funders`);
    } finally {
      await closeDb();
    }
  });

function extractJunctionTablesDataFromOpenalexArticles(params: {
  openalexArticles: (Work | WorkSearchResult)[];
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
  for (const openalexArticle of params.openalexArticles) {
    const articleRecord = articleRecordByOpenalexId.get(openalexArticle.id)!;

    // Extract articleAuthors
    for (const {
      author,
      institutions,
      author_position,
    } of openalexArticle.authorships) {
      if (author.orcid) {
        const authorRecord = authorRecordByOrcid.get(author.orcid)!;
        // TODO: Just get the first listed institution for now
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
      }
    }

    // Extract articleFunders
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

  return { articleAuthors, articleFunders };
}

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
