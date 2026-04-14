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
  inArray,
  SQL,
} from "drizzle-orm";
import {
  AI_REVIEW_MIN_DATE,
  PDF_REVIEW_MIN_DATE,
} from "../aiReviewResults/aiReviewResultsRepository";
import { datasets } from "../datasets/unifiedSchema";
import { dryadDatasetDetails } from "../datasets/dryadDetailsSchema";
import { datasetTags, tags } from "../datasets/tagsSchema";
import { datasetFiles } from "../datasetFiles/schema";
import { alias } from "drizzle-orm/pg-core";
import { humanReviews } from "../humanReview/schema";
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

export interface DryadDatasetForPdfDownload {
  datasetId: number;
  datasetExtId: string;
  articleId: number;
  articleTitle: string;
  extOpenalexId: string;
}

export async function getDryadDatasetsForPdfDownload(
  limit: number,
  extId?: number,
): Promise<DryadDatasetForPdfDownload[]> {
  const hasSuspiciousReview = sql<boolean>`EXISTS (
    SELECT 1 FROM ai_review_results
    WHERE ai_review_results.dataset_id = ${datasets.id}
    AND ai_review_results.is_latest_review = true
    AND ai_review_results.true_positive_probability > 0.5
    AND ai_review_results.created_at > ${AI_REVIEW_MIN_DATE}
  )`;

  const selectFields = {
    datasetId: datasets.id,
    datasetExtId: datasets.extId,
    articleId: articles.id,
    articleTitle: articles.title,
    extOpenalexId: articles.extOpenalexId,
  };

  // When extId is provided, filter by it and ignore whether PDF exists
  if (extId !== undefined) {
    return db
      .select(selectFields)
      .from(datasets)
      .innerJoin(articles, eq(articles.id, datasets.articleId))
      .innerJoin(
        dryadDatasetDetails,
        eq(dryadDatasetDetails.datasetId, datasets.id),
      )
      .where(
        and(
          eq(datasets.source, "dryad"),
          eq(dryadDatasetDetails.extIdNumeric, extId),
          hasSuspiciousReview,
        ),
      );
  }

  const hasPdf = sql<boolean>`EXISTS (
    SELECT 1 FROM dataset_files df
    WHERE df.dataset_id = ${datasets.id}
    AND df.file_type = 'pdf'
  )`;

  return db
    .select(selectFields)
    .from(datasets)
    .innerJoin(articles, eq(articles.id, datasets.articleId))
    .where(
      and(
        eq(datasets.source, "dryad"),
        sql`NOT ${hasPdf}`,
        hasSuspiciousReview,
      ),
    )
    .limit(limit);
}

export interface DashboardArticle {
  id: number;
  doi: string | null;
  title: string;
  fullPdfUrl: string | null;
  publicationDate: string | null;
  numCitations: number;
  journalTitle: string | null;
  journalSjrScore: number | null;
  truePositiveProbability: number | null;
  impactScore: number | null;
  citationScore: number;
  subfield: string | null;
  countryCode: string | null;
  pdfFilename: string | null;
  pdfFileSize: number | null;
  datasetId: number | null;
  extId: string | null;
  humanReviewVerdict: "true_positive" | "false_positive" | "ambiguous" | null;
  humanReviewImpactScore: number | null;
  humanReviewUpdatedAt: string | null;
  source: "dryad" | "pmc" | null;
  tags: Array<{ id: string; name: string; color: string }>;
}

export async function getDashboardArticles(
  sortParams: SortParams = DEFAULT_SORT,
  filterParams: FilterParams = DEFAULT_FILTERS,
): Promise<DashboardArticle[]> {
  const maxScoresSubquery = db
    .select({
      datasetId: aiReviewResults.datasetId,
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
    .groupBy(aiReviewResults.datasetId)
    .as("max_scores");

  const articlePdfFiles = alias(datasetFiles, "article_pdf_files");

  const citationScoreExpr =
    sql<number>`(COALESCE(${journals.sjrScore}, 0.0) + ${articles.numCitations}) * LOG(10.0 + COALESCE(${journals.sjrScore}, 0.0)) / (1.0 + COALESCE(CAST(CURRENT_DATE - ${articles.publicationDate} AS numeric) / 365.25, 10.0))`.as(
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
      case SORT_FIELDS.HUMAN_REVIEW_DATE:
        return humanReviews.updatedAt;
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
        filterConditions.push(isNotNull(articlePdfFiles.filename));
      } else if (filter.option === "not-available") {
        filterConditions.push(isNull(articlePdfFiles.filename));
      }
    } else if (filter.key === FILTER_KEYS.MIN_IMPACT_SCORE) {
      if (filter.minScore !== null) {
        filterConditions.push(
          gte(maxScoresSubquery.maxImpactScore, filter.minScore),
        );
      }
    } else if (filter.key === FILTER_KEYS.MIN_HUMAN_REVIEW_IMPACT_SCORE) {
      if (filter.minScore !== null) {
        filterConditions.push(gte(humanReviews.impactScore, filter.minScore));
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
    } else if (filter.key === FILTER_KEYS.TAG) {
      if (filter.selectedTagIds.length > 0) {
        filterConditions.push(
          sql`${datasets.id} IN (SELECT ${datasetTags.datasetId} FROM ${datasetTags} WHERE ${inArray(datasetTags.tagId, filter.selectedTagIds)})`,
        );
      }
    } else if (filter.key === FILTER_KEYS.META_ANALYSIS) {
      if (filter.option === "exclude") {
        filterConditions.push(sql`${datasets.isMetaAnalysis} IS NOT TRUE`);
      } else if (filter.option === "only") {
        filterConditions.push(eq(datasets.isMetaAnalysis, true));
      }
    } else if (filter.key === FILTER_KEYS.SOURCE) {
      if (filter.option === "dryad") {
        filterConditions.push(eq(datasets.source, "dryad"));
      } else if (filter.option === "pmc") {
        filterConditions.push(eq(datasets.source, "pmc"));
      }
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
      journalTitle: journals.title,
      journalSjrScore: journals.sjrScore,
      truePositiveProbability: maxScoresSubquery.maxTruePositiveProbability,
      impactScore: maxScoresSubquery.maxImpactScore,
      citationScore: citationScoreExpr,
      subfield: articles.subfield,
      countryCode: institutions.countryCode,
      pdfFilename: articlePdfFiles.filename,
      pdfFileSize: articlePdfFiles.size,
      datasetId: datasets.id,
      extId: datasets.extId,
      humanReviewVerdict: humanReviews.verdict,
      humanReviewImpactScore: humanReviews.impactScore,
      humanReviewUpdatedAt: sql<string>`${humanReviews.updatedAt}::text`.as(
        "humanReviewUpdatedAt",
      ),
      tags: sql<
        Array<{ id: string; name: string; color: string }>
      >`(SELECT COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color)), '[]'::json) FROM ${datasetTags} dt JOIN ${tags} t ON t.id = dt.tag_id WHERE dt.dataset_id = ${datasets.id})`.as(
        "tags",
      ),
      source: datasets.source,
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
    .innerJoin(datasets, eq(datasets.articleId, articles.id))
    .leftJoin(
      articlePdfFiles,
      and(
        eq(articlePdfFiles.datasetId, datasets.id),
        eq(articlePdfFiles.fileType, "pdf"),
        eq(articlePdfFiles.isMainArticle, true),
      ),
    )
    .leftJoin(
      humanReviews,
      and(
        eq(humanReviews.datasetId, datasets.id),
        eq(humanReviews.isLatestReview, true),
      ),
    )
    .innerJoin(maxScoresSubquery, eq(maxScoresSubquery.datasetId, datasets.id));

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
