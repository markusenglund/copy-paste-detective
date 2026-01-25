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
): Promise<Article[]> {
  const hasSuspiciousReview = sql<boolean>`EXISTS (
    SELECT 1 FROM ai_review_results
    WHERE ai_review_results.dryad_dataset_id = articles.dryad_dataset_id
    AND ai_review_results.suspicion_score >= 4
  )`;

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
