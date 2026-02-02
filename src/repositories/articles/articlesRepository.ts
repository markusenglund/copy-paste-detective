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
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { DownloadStatus } from "../../db/shared/enums";
import { AI_REVIEW_MIN_DATE } from "../aiReviewResults/aiReviewResultsRepository";
import { dryadDatasets } from "../datasets/schema";

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
    .select()
    .from(articles)
    .where(
      and(
        isNotNull(articles.fullPdfUrl),
        eq(articles.pdfDownloadStatus, "not_started"),
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
