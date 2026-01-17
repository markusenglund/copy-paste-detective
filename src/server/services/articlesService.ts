import { db } from "../../db";
import { articles } from "../../repositories/articles/schema";
import { journals } from "../../repositories/journals/schema";
import { aiReviewResults } from "../../repositories/aiReviewResults/schema";
import { desc, eq, sql } from "drizzle-orm";

export interface ArticleForUpload {
  id: number;
  doi: string | null;
  title: string;
  fullPdfUrl: string | null;
  publicationDate: string | null;
  numCitations: number;
  pdfDownloadStatus: string | null;
  journalTitle: string | null;
  suspicionScore: number | null;
}

export async function getArticlesForManualUpload(): Promise<
  ArticleForUpload[]
> {
  // Subquery to get the latest ai_review_result per dryadDatasetId
  const latestReviewSubquery = db
    .select({
      dryadDatasetId: aiReviewResults.dryadDatasetId,
      suspicionScore: aiReviewResults.suspicionScore,
      rowNumber: sql<number>`ROW_NUMBER() OVER (
        PARTITION BY ${aiReviewResults.dryadDatasetId}
        ORDER BY ${aiReviewResults.createdAt} DESC
      )`.as("row_number"),
    })
    .from(aiReviewResults)
    .as("latest_reviews");

  const result = await db
    .select({
      id: articles.id,
      doi: articles.doi,
      title: articles.title,
      fullPdfUrl: articles.fullPdfUrl,
      publicationDate: articles.publicationDate,
      numCitations: articles.numCitations,
      pdfDownloadStatus: articles.pdfDownloadStatus,
      journalTitle: journals.title,
      suspicionScore: latestReviewSubquery.suspicionScore,
    })
    .from(articles)
    .leftJoin(journals, eq(articles.journalId, journals.id))
    .innerJoin(
      latestReviewSubquery,
      sql`${latestReviewSubquery.dryadDatasetId} = ${articles.dryadDatasetId} AND ${latestReviewSubquery.rowNumber} = 1`,
    )
    .where(
      sql`${articles.pdfDownloadStatus} IS NULL OR ${articles.pdfDownloadStatus} NOT IN ('completed', 'manually_added')`,
    )
    .orderBy(desc(latestReviewSubquery.suspicionScore));

  return result;
}
