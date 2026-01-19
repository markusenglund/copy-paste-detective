import { db } from "../../db";
import { articles, articleAuthors } from "../../repositories/articles/schema";
import { journals } from "../../repositories/journals/schema";
import { aiReviewResults } from "../../repositories/aiReviewResults/schema";
import { institutions } from "../../repositories/institutions/schema";
import { desc, eq, sql, and } from "drizzle-orm";

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
  citationNormalizedPercentile: number | null;
  subfield: string | null;
  countryCode: string | null;
}

export async function getArticlesForManualUpload(): Promise<
  ArticleForUpload[]
> {
  // Subquery to get the maximum suspicion score per dryadDatasetId
  const maxScoreSubquery = db
    .select({
      dryadDatasetId: aiReviewResults.dryadDatasetId,
      maxSuspicionScore: sql<number>`MAX(${aiReviewResults.suspicionScore})`.as(
        "max_suspicion_score",
      ),
    })
    .from(aiReviewResults)
    .groupBy(aiReviewResults.dryadDatasetId)
    .as("max_scores");

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
      suspicionScore: maxScoreSubquery.maxSuspicionScore,
      citationNormalizedPercentile: articles.citationNormalizedPercentile,
      subfield: articles.subfield,
      countryCode: institutions.countryCode,
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
    .innerJoin(
      maxScoreSubquery,
      eq(maxScoreSubquery.dryadDatasetId, articles.dryadDatasetId),
    )
    .where(
      sql`${articles.pdfDownloadStatus} IS NULL OR ${articles.pdfDownloadStatus} NOT IN ('completed', 'manually_added')`,
    )
    .orderBy(desc(maxScoreSubquery.maxSuspicionScore));

  return result;
}
