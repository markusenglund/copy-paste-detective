import { db } from "../../db";
import {
  articles,
  articleAuthors,
  articleFunders,
  ArticleInsert,
  ArticleAuthorInsert,
  ArticleFunderInsert,
  Article,
} from "./schema";
import { processInBatches } from "../../utils/batch";
import {
  and,
  eq,
  isNotNull,
  isNull,
  sql,
  desc,
  asc,
  gt,
  gte,
  SQL,
} from "drizzle-orm";
import { DownloadStatus } from "../../db/shared/enums";
import {
  AI_REVIEW_MIN_DATE,
  PDF_REVIEW_MIN_DATE,
} from "../aiReviewResults/aiReviewResultsRepository";
import { dryadDatasets } from "../datasets/schema";
import { pdfFiles } from "../pdfFiles/schema";
import { humanReviews, prosecutionStatuses } from "../humanReview/schema";
import { journals } from "../journals/schema";
import { aiReviewResults } from "../aiReviewResults/schema";
import { aiPdfReviewResults } from "../aiPdfReviewResults/schema";
import { institutions } from "../institutions/schema";
import {
  SortParams,
  SORT_FIELDS,
  SORT_ORDERS,
  DEFAULT_SORT,
} from "../../shared/sortTypes";
import {
  FilterParams,
  FILTER_KEYS,
  DEFAULT_FILTERS,
} from "../../shared/filterTypes";

const BATCH_SIZE = 500;

export async function bulkUpsertArticles(
  data: ArticleInsert[],
): Promise<Article[]> {
  if (data.length === 0) return [];

  return processInBatches(data, BATCH_SIZE, (batch) =>
    db
      .insert(articles)
      .values(batch)
      .onConflictDoUpdate({
        target: articles.extOpenalexId,
        set: {
          doi: articles.doi,
          title: articles.title,
          publicationDate: articles.publicationDate,
          numCitations: articles.numCitations,
          citationNormalizedPercentile: articles.citationNormalizedPercentile,
          citedByPercentileYearMin: articles.citedByPercentileYearMin,
          fullPdfUrl: articles.fullPdfUrl,
          field: articles.field,
          subfield: articles.subfield,
          topic: articles.topic,
          journalId: articles.journalId,
          updatedTimestamp: new Date(),
        },
      })
      .returning(),
  );
}

export type ArticleAuthor = typeof articleAuthors.$inferSelect;

export async function bulkUpsertArticleAuthors(
  data: ArticleAuthorInsert[],
): Promise<ArticleAuthor[]> {
  if (data.length === 0) return [];

  return processInBatches(data, BATCH_SIZE, (batch) =>
    db
      .insert(articleAuthors)
      .values(batch)
      .onConflictDoUpdate({
        target: [articleAuthors.articleId, articleAuthors.authorId],
        set: {
          authorPosition: articleAuthors.authorPosition,
          institutionId: articleAuthors.institutionId,
          updatedTimestamp: new Date(),
        },
      })
      .returning(),
  );
}

export type ArticleFunder = typeof articleFunders.$inferSelect;

export async function bulkInsertArticleFunders(
  data: ArticleFunderInsert[],
): Promise<ArticleFunder[]> {
  if (data.length === 0) return [];

  return processInBatches(data, BATCH_SIZE, (batch) =>
    db
      .insert(articleFunders)
      .values(batch)
      .onConflictDoNothing({
        target: [articleFunders.articleId, articleFunders.funderId],
      })
      .returning(),
  );
}

export async function getArticlesForPdfDownload(
  limit: number,
  extId?: number,
): Promise<Article[]> {
  const hasSuspiciousReview = sql<boolean>`EXISTS (
    SELECT 1 FROM ai_review_results
    WHERE ai_review_results.dryad_dataset_id = articles.dryad_dataset_id
    AND ai_review_results.is_latest_review = true
    AND ai_review_results.true_positive_probability > 0.5
    AND ai_review_results.created_at > ${AI_REVIEW_MIN_DATE}
  )`;

  // When extId is provided, filter by it and ignore download status
  if (extId !== undefined) {
    return db
      .select({
        id: articles.id,
        doi: articles.doi,
        extOpenalexId: articles.extOpenalexId,
        title: articles.title,
        publicationDate: articles.publicationDate,
        numCitations: articles.numCitations,
        citationNormalizedPercentile: articles.citationNormalizedPercentile,
        citedByPercentileYearMin: articles.citedByPercentileYearMin,
        fullPdfUrl: articles.fullPdfUrl,
        pdfDownloadStatus: articles.pdfDownloadStatus,
        field: articles.field,
        subfield: articles.subfield,
        topic: articles.topic,
        dryadDatasetId: articles.dryadDatasetId,
        journalId: articles.journalId,
        createdTimestamp: articles.createdTimestamp,
        updatedTimestamp: articles.updatedTimestamp,
      })
      .from(articles)
      .innerJoin(dryadDatasets, eq(articles.dryadDatasetId, dryadDatasets.id))
      .where(
        and(
          isNotNull(articles.fullPdfUrl),
          isNotNull(articles.dryadDatasetId),
          eq(dryadDatasets.extId, extId),
          hasSuspiciousReview,
        ),
      );
  }

  return db
    .select({
      id: articles.id,
      doi: articles.doi,
      extOpenalexId: articles.extOpenalexId,
      title: articles.title,
      publicationDate: articles.publicationDate,
      numCitations: articles.numCitations,
      citationNormalizedPercentile: articles.citationNormalizedPercentile,
      citedByPercentileYearMin: articles.citedByPercentileYearMin,
      fullPdfUrl: articles.fullPdfUrl,
      pdfDownloadStatus: articles.pdfDownloadStatus,
      field: articles.field,
      subfield: articles.subfield,
      topic: articles.topic,
      dryadDatasetId: articles.dryadDatasetId,
      journalId: articles.journalId,
      createdTimestamp: articles.createdTimestamp,
      updatedTimestamp: articles.updatedTimestamp,
    })
    .from(articles)
    .leftJoin(pdfFiles, eq(pdfFiles.articleId, articles.id))
    .where(
      and(
        isNotNull(articles.fullPdfUrl),
        isNull(pdfFiles.id),
        isNotNull(articles.dryadDatasetId),
        hasSuspiciousReview,
      ),
    )
    .limit(limit);
}

export async function updateArticlePdfDownloadStatus(
  articleId: number,
  status: DownloadStatus,
): Promise<void> {
  await db
    .update(articles)
    .set({
      pdfDownloadStatus: status,
      updatedTimestamp: new Date(),
    })
    .where(eq(articles.id, articleId));
}

export interface DashboardArticle {
  id: number;
  doi: string | null;
  title: string;
  fullPdfUrl: string | null;
  publicationDate: string | null;
  numCitations: number;
  pdfDownloadStatus: string | null;
  journalTitle: string | null;
  journalSjrScore: number | null;
  truePositiveProbability: number | null;
  impactScore: number | null;
  citationScore: number;
  subfield: string | null;
  countryCode: string | null;
  pdfFilename: string | null;
  pdfFileSize: number | null;
  dryadDatasetId: number | null;
  dryadExtId: number | null;
  humanReviewVerdict: "true_positive" | "false_positive" | "ambiguous" | null;
  humanReviewImpactScore: number | null;
  caseName: string | null;
}

export async function getDashboardArticles(
  sortParams: SortParams = DEFAULT_SORT,
  filterParams: FilterParams = DEFAULT_FILTERS,
): Promise<DashboardArticle[]> {
  const maxScoresSubquery = db
    .select({
      dryadDatasetId: aiReviewResults.dryadDatasetId,
      maxTruePositiveProbability:
        sql<number>`MAX(${aiReviewResults.truePositiveProbability})`.as(
          "max_true_positive_probability",
        ),
      maxImpactScore: sql<number>`MAX(${aiPdfReviewResults.impactScore})`.as(
        "max_impact_score",
      ),
    })
    .from(aiReviewResults)
    .leftJoin(
      aiPdfReviewResults,
      and(
        eq(aiPdfReviewResults.aiReviewResultId, aiReviewResults.id),
        gt(aiPdfReviewResults.createdAt, PDF_REVIEW_MIN_DATE),
      ),
    )
    .where(
      and(
        eq(aiReviewResults.isLatestReview, true),
        gt(aiReviewResults.createdAt, AI_REVIEW_MIN_DATE),
      ),
    )
    .groupBy(aiReviewResults.dryadDatasetId)
    .as("max_scores");

  const citationScoreExpr =
    sql<number>`(COALESCE(${journals.sjrScore}, 0.0) + ${articles.numCitations}) / (1.0 + COALESCE(CAST(CURRENT_DATE - ${articles.publicationDate} AS numeric) / 365.25, 10.0))`.as(
      "citationScore",
    );

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const getSortColumn = () => {
    switch (sortParams.sortBy) {
      case SORT_FIELDS.PROBABILITY:
        return maxScoresSubquery.maxTruePositiveProbability;
      case SORT_FIELDS.IMPACT:
        return maxScoresSubquery.maxImpactScore;
      case SORT_FIELDS.PUBLISHED:
        return articles.publicationDate;
      case SORT_FIELDS.CITATIONS:
        return articles.numCitations;
      case SORT_FIELDS.CITATION_SCORE:
        return citationScoreExpr;
      default:
        return maxScoresSubquery.maxTruePositiveProbability;
    }
  };

  const sortColumn = getSortColumn();
  const orderByClause =
    sortParams.sortOrder === SORT_ORDERS.DESC
      ? desc(sortColumn)
      : asc(sortColumn);

  const filterConditions: SQL[] = [];

  for (const filter of filterParams.filters) {
    if (filter.key === FILTER_KEYS.HIGH_PROBABILITY) {
      if (filter.enabled) {
        filterConditions.push(
          gt(maxScoresSubquery.maxTruePositiveProbability, filter.threshold),
        );
      }
    } else if (filter.key === FILTER_KEYS.PDF_AVAILABILITY) {
      if (filter.option === "available") {
        filterConditions.push(isNotNull(pdfFiles.filename));
      } else if (filter.option === "not-available") {
        filterConditions.push(isNull(pdfFiles.filename));
      }
    } else if (filter.key === FILTER_KEYS.MIN_IMPACT_SCORE) {
      if (filter.minScore !== null) {
        filterConditions.push(
          gte(maxScoresSubquery.maxImpactScore, filter.minScore),
        );
      }
    } else if (filter.key === FILTER_KEYS.FIELD) {
      if (filter.selectedField !== null) {
        filterConditions.push(eq(articles.field, filter.selectedField));
      }
    } else if (filter.key === FILTER_KEYS.REVIEW_STATUS) {
      if (filter.option === "has_review") {
        filterConditions.push(isNotNull(humanReviews.verdict));
      } else if (filter.option === "no_review") {
        filterConditions.push(isNull(humanReviews.verdict));
      } else if (filter.option === "true_positive") {
        filterConditions.push(eq(humanReviews.verdict, "true_positive"));
      } else if (filter.option === "false_positive") {
        filterConditions.push(eq(humanReviews.verdict, "false_positive"));
      } else if (filter.option === "ambiguous") {
        filterConditions.push(eq(humanReviews.verdict, "ambiguous"));
      }
      // "all" option adds no condition
    }
  }

  const whereClause =
    filterConditions.length > 0 ? and(...filterConditions) : undefined;

  let query = db
    .select({
      id: articles.id,
      doi: articles.doi,
      title: articles.title,
      fullPdfUrl: articles.fullPdfUrl,
      publicationDate: articles.publicationDate,
      numCitations: articles.numCitations,
      pdfDownloadStatus: articles.pdfDownloadStatus,
      journalTitle: journals.title,
      journalSjrScore: journals.sjrScore,
      truePositiveProbability: maxScoresSubquery.maxTruePositiveProbability,
      impactScore: maxScoresSubquery.maxImpactScore,
      citationScore: citationScoreExpr,
      subfield: articles.subfield,
      countryCode: institutions.countryCode,
      pdfFilename: pdfFiles.filename,
      pdfFileSize: pdfFiles.size,
      dryadDatasetId: articles.dryadDatasetId,
      dryadExtId: dryadDatasets.extId,
      humanReviewVerdict: humanReviews.verdict,
      humanReviewImpactScore: humanReviews.impactScore,
      caseName: prosecutionStatuses.name,
    })
    .from(articles)
    .leftJoin(journals, eq(articles.journalId, journals.id))
    .leftJoin(
      articleAuthors,
      and(
        eq(articleAuthors.articleId, articles.id),
        eq(articleAuthors.authorPosition, "first"),
      ),
    )
    .leftJoin(institutions, eq(articleAuthors.institutionId, institutions.id))
    .leftJoin(pdfFiles, eq(pdfFiles.articleId, articles.id))
    .leftJoin(dryadDatasets, eq(articles.dryadDatasetId, dryadDatasets.id))
    .leftJoin(
      humanReviews,
      eq(humanReviews.dryadDatasetId, articles.dryadDatasetId),
    )
    .leftJoin(
      prosecutionStatuses,
      eq(prosecutionStatuses.id, humanReviews.prosecutionStatusId),
    )
    .innerJoin(
      maxScoresSubquery,
      eq(maxScoresSubquery.dryadDatasetId, articles.dryadDatasetId),
    );

  if (whereClause) {
    query = query.where(whereClause) as typeof query;
  }

  const result = await query.orderBy(orderByClause);

  return result;
}

export async function getAvailableFields(): Promise<string[]> {
  const result = await db
    .selectDistinct({ field: articles.field })
    .from(articles)
    .where(isNotNull(articles.field))
    .orderBy(asc(articles.field));

  return result.map((row) => row.field as string);
}
