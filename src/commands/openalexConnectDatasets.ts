import { Command } from "@commander-js/extra-typings";
import {
  DryadDataset,
  getCompletedDatasetsWithoutArticles,
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
  bulkInsertArticleFunders,
} from "../repositories/articles/articlesRepository";
import { bulkUpsertAuthors } from "../repositories/authors/authorsRepository";
import { bulkUpsertInstitutions } from "../repositories/institutions/institutionsRepository";
import { bulkUpsertFunders } from "../repositories/funders/fundersRepository";

type OpenAlexArticleWithDataset = {
  dataset: DryadDataset;
  openalexArticle: Work | WorkSearchResult;
};

const program = new Command();

program
  .name("openalex-connect-datasets")
  .description(
    "Connect downloaded datasets to an article from the OpenAlex API",
  )
  .action(async () => {
    try {
      const datasets = await getCompletedDatasetsWithoutArticles();
      logger.info(
        `Found ${datasets.length} datasets to search OpenAlex for...`,
      );
      const articlesWithDatasets = await getArticlesFromDryadDatasets(datasets);
      logger.info(
        `Found ${articlesWithDatasets.length} OpenAlex articles from ${datasets.length} datasets`,
      );
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
      logger.info(`Upserted ${insertedArticleAuthors.length} article-authors`);

      const insertedArticleFunders =
        await bulkInsertArticleFunders(articleFunders);
      logger.info(
        `Inserted ${insertedArticleFunders.length} (out of ${articleFunders.length} found) article-funders`,
      );
    } finally {
      await closeDb();
    }
  });

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

    // Extract articleAuthors (deduplicate authors by ORCID per article)
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
  articlesWithDatasets: OpenAlexArticleWithDataset[],
): Promise<ArticleInsert[]> {
  const journalByIssn = await getJournalsByIssnMap();
  const articles = articlesWithDatasets.map(({ dataset, openalexArticle }) => {
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
    return { ...article, dryadDatasetId: dataset.id };
  });
  return articles;
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

async function getArticlesFromDryadDatasets(
  datasets: DryadDataset[],
): Promise<OpenAlexArticleWithDataset[]> {
  const results: OpenAlexArticleWithDataset[] = [];
  for (const dataset of datasets) {
    const openalexArticle = await getArticleFromDryadDataset(dataset);
    if (openalexArticle) {
      results.push({ dataset, openalexArticle });
    }
  }
  return results;
}

program.parse();
