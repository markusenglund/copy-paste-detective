import { db } from "../../db";
import { articles, articleAuthors } from "../../repositories/articles/schema";
import { journals } from "../../repositories/journals/schema";
import { aiReviewResults } from "../../repositories/aiReviewResults/schema";
import { institutions } from "../../repositories/institutions/schema";
import { pdfFiles } from "../../repositories/pdfFiles/schema";
import { desc, eq, sql, and, gt } from "drizzle-orm";
import { AI_REVIEW_MIN_DATE } from "../../repositories/aiReviewResults/aiReviewResultsRepository";

export interface ArticleForUpload {
  id: number;
  doi: string | null;
  title: string;
  fullPdfUrl: string | null;
  publicationDate: string | null;
  numCitations: number;
  pdfDownloadStatus: string | null;
  journalTitle: string | null;
  truePositiveProbability: number | null;
  citationNormalizedPercentile: number | null;
  subfield: string | null;
  countryCode: string | null;
  pdfFilename: string | null;
  pdfFileSize: number | null;
}

export async function getArticlesForManualUpload(): Promise<
  ArticleForUpload[]
> {
  // Subquery to get the maximum true positive probability per dryadDatasetId
  const maxScoreSubquery = db
    .select({
      dryadDatasetId: aiReviewResults.dryadDatasetId,
      maxTruePositiveProbability:
        sql<number>`MAX(${aiReviewResults.truePositiveProbability})`.as(
          "max_true_positive_probability",
        ),
    })
    .from(aiReviewResults)
    .where(gt(aiReviewResults.createdAt, AI_REVIEW_MIN_DATE))
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
      truePositiveProbability: maxScoreSubquery.maxTruePositiveProbability,
      citationNormalizedPercentile: articles.citationNormalizedPercentile,
      subfield: articles.subfield,
      countryCode: institutions.countryCode,
      pdfFilename: pdfFiles.filename,
      pdfFileSize: pdfFiles.size,
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
    .innerJoin(
      maxScoreSubquery,
      eq(maxScoreSubquery.dryadDatasetId, articles.dryadDatasetId),
    )
    .orderBy(desc(maxScoreSubquery.maxTruePositiveProbability));

  return result;
}
