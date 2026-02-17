import { db } from "../../db";
import { dryadDatasets } from "../../repositories/datasets/schema";
import {
  articles,
  articleAuthors,
  articleFunders,
} from "../../repositories/articles/schema";
import { funders } from "../../repositories/funders/schema";
import { journals } from "../../repositories/journals/schema";
import { aiReviewResults } from "../../repositories/aiReviewResults/schema";
import { aiPdfReviewResults } from "../../repositories/aiPdfReviewResults/schema";
import { authors } from "../../repositories/authors/schema";
import { institutions } from "../../repositories/institutions/schema";
import { dryadExcelFiles } from "../../repositories/excelFiles/schema";
import { pdfFiles } from "../../repositories/pdfFiles/schema";
import {
  humanReviews,
  prosecutionStatuses,
} from "../../repositories/humanReview/schema";
import { eq, sql, and, gt } from "drizzle-orm";
import { AI_REVIEW_MIN_DATE } from "../../repositories/aiReviewResults/aiReviewResultsRepository";
import { DatasetDetails } from "../../shared/datasetTypes";
import { existsSync } from "node:fs";
import { join } from "node:path";

export async function getDatasetDetails(
  datasetId: number,
): Promise<DatasetDetails | null> {
  // First verify dataset has non-obsolete reviews
  const validReviews = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiReviewResults)
    .where(
      and(
        eq(aiReviewResults.dryadDatasetId, datasetId),
        gt(aiReviewResults.createdAt, AI_REVIEW_MIN_DATE),
      ),
    );

  if (!validReviews[0] || validReviews[0].count === 0) {
    return null;
  }

  // Get latest AI review per sheet using is_latest_review flag
  const latestAiReviews = await db
    .select({
      id: aiReviewResults.id,
      sheetName: aiReviewResults.sheetName,
      dryadExcelFileId: aiReviewResults.dryadExcelFileId,
      prompt: aiReviewResults.prompt,
      response: aiReviewResults.response,
      model: aiReviewResults.model,
      truePositiveProbability: aiReviewResults.truePositiveProbability,
      createdAt: aiReviewResults.createdAt,
    })
    .from(aiReviewResults)
    .where(
      and(
        eq(aiReviewResults.dryadDatasetId, datasetId),
        eq(aiReviewResults.isLatestReview, true),
        gt(aiReviewResults.createdAt, AI_REVIEW_MIN_DATE),
      ),
    );

  if (latestAiReviews.length === 0) {
    return null;
  }

  // Get latest PDF review per AI review
  const latestPdfPerReview = sql`(
    SELECT
      ai_review_result_id,
      MAX(created_at) as max_created_at
    FROM ai_pdf_review_results
    GROUP BY ai_review_result_id
  )`;

  const latestPdfReviews = await db
    .select({
      aiReviewResultId: aiPdfReviewResults.aiReviewResultId,
      prompt: aiPdfReviewResults.prompt,
      response: aiPdfReviewResults.response,
      model: aiPdfReviewResults.model,
      impactScore: aiPdfReviewResults.impactScore,
      createdAt: aiPdfReviewResults.createdAt,
    })
    .from(aiPdfReviewResults)
    .innerJoin(
      sql`${latestPdfPerReview} latest_pdf`,
      sql`${aiPdfReviewResults.aiReviewResultId} = latest_pdf.ai_review_result_id
          AND ${aiPdfReviewResults.createdAt} = latest_pdf.max_created_at`,
    );

  // Get dataset and article information
  const datasetInfo = await db
    .select({
      datasetId: dryadDatasets.id,
      extId: dryadDatasets.extId,
      datasetDoi: dryadDatasets.datasetDoi,
      datasetTitle: dryadDatasets.title,
      abstract: dryadDatasets.abstract,
      articleId: articles.id,
      articleTitle: articles.title,
      articleDoi: articles.doi,
      citations: articles.numCitations,
      citationScore:
        sql<number>`(COALESCE(${journals.sjrScore}, 0.0) + ${articles.numCitations}) * LOG(10.0 + COALESCE(${journals.sjrScore}, 0.0)) / (1.0 + COALESCE(CAST(CURRENT_DATE - ${articles.publicationDate} AS numeric) / 365.25, 10.0))`.as(
          "citationScore",
        ),
      publicationDate: articles.publicationDate,
      journalName: journals.title,
      journalSjrScore: journals.sjrScore,
      pdfFilename: pdfFiles.filename,
      pdfFileSize: pdfFiles.size,
    })
    .from(dryadDatasets)
    .leftJoin(articles, eq(dryadDatasets.id, articles.dryadDatasetId))
    .leftJoin(journals, eq(articles.journalId, journals.id))
    .leftJoin(pdfFiles, eq(pdfFiles.articleId, articles.id))
    .where(eq(dryadDatasets.id, datasetId))
    .limit(1);

  if (!datasetInfo[0]) {
    return null;
  }

  const info = datasetInfo[0];

  // Get human review if it exists
  const humanReview = await db
    .select({
      verdict: humanReviews.verdict,
      impactScore: humanReviews.impactScore,
      notes: humanReviews.notes,
      updatedAt: humanReviews.updatedAt,
      prosecutionStatusId: humanReviews.prosecutionStatusId,
      caseName: prosecutionStatuses.name,
    })
    .from(humanReviews)
    .leftJoin(
      prosecutionStatuses,
      eq(prosecutionStatuses.id, humanReviews.prosecutionStatusId),
    )
    .where(eq(humanReviews.dryadDatasetId, datasetId))
    .limit(1);

  // Get authors for the article
  const authorsList = info.articleId
    ? await db
        .select({
          name: authors.displayName,
          position: articleAuthors.authorPosition,
          institutionName: institutions.displayName,
        })
        .from(articleAuthors)
        .innerJoin(authors, eq(articleAuthors.authorId, authors.id))
        .leftJoin(
          institutions,
          eq(articleAuthors.institutionId, institutions.id),
        )
        .where(eq(articleAuthors.articleId, info.articleId))
        .orderBy(articleAuthors.authorPosition)
    : [];

  // Get funders for the article
  const fundersList = info.articleId
    ? await db
        .select({
          displayName: funders.displayName,
          rorId: funders.rorId,
        })
        .from(articleFunders)
        .innerJoin(funders, eq(articleFunders.funderId, funders.id))
        .where(eq(articleFunders.articleId, info.articleId))
    : [];

  // Get Excel file names
  const excelFiles = await db
    .select({
      id: dryadExcelFiles.id,
      fileName: dryadExcelFiles.filename,
    })
    .from(dryadExcelFiles)
    .where(eq(dryadExcelFiles.dryadDatasetId, datasetId));

  const fileIdToName = new Map(excelFiles.map((f) => [f.id, f.fileName]));

  // Check which files have highlighted versions
  const highlightedFileIds = new Set<number>();
  for (const file of excelFiles) {
    const highlightedFilename = file.fileName.endsWith(".xls")
      ? file.fileName.replace(".xls", ".xlsx")
      : file.fileName;
    const highlightedPath = join(
      process.cwd(),
      "highlighted-output",
      info.extId.toString(),
      highlightedFilename,
    );
    if (existsSync(highlightedPath)) {
      highlightedFileIds.add(file.id);
    }
  }

  // Build PDF review map by AI review result ID
  const pdfReviewMap = new Map(
    latestPdfReviews.map((pr) => [pr.aiReviewResultId, pr]),
  );

  const sheetReviews = latestAiReviews.map((aiReview) => {
    const pdfReview = pdfReviewMap.get(aiReview.id);
    return {
      sheetName: aiReview.sheetName,
      excelFileName: fileIdToName.get(aiReview.dryadExcelFileId) || "Unknown",
      hasHighlightedVersion: highlightedFileIds.has(aiReview.dryadExcelFileId),
      aiReview: {
        prompt: aiReview.prompt,
        response: aiReview.response,
        model: aiReview.model,
        truePositiveProbability: aiReview.truePositiveProbability,
        createdAt: aiReview.createdAt,
      },
      pdfReview: pdfReview
        ? {
            prompt: pdfReview.prompt,
            response: pdfReview.response,
            model: pdfReview.model,
            impactScore: pdfReview.impactScore,
            createdAt: pdfReview.createdAt,
          }
        : null,
    };
  });

  return {
    dataset: {
      id: info.datasetId,
      extId: info.extId,
      doi: info.datasetDoi,
      title: info.datasetTitle,
      abstract: info.abstract,
    },
    article: {
      id: info.articleId || 0,
      title: info.articleTitle || "Unknown Article",
      doi: info.articleDoi,
      citations: info.citations,
      citationScore: info.citationScore,
      publicationDate: info.publicationDate
        ? new Date(info.publicationDate)
        : null,
      journalName: info.journalName,
      journalSjrScore: info.journalSjrScore,
      pdfFilename: info.pdfFilename,
      pdfFileSize: info.pdfFileSize,
      authors: authorsList.map((a) => ({
        name: a.name,
        position: a.position === "first" ? 1 : a.position === "last" ? 999 : 2,
        institution: a.institutionName,
      })),
      funders: fundersList,
    },
    humanReview: humanReview[0]
      ? {
          verdict: humanReview[0].verdict,
          impactScore: humanReview[0].impactScore,
          notes: humanReview[0].notes,
          updatedAt: humanReview[0].updatedAt,
          prosecutionStatusId: humanReview[0].prosecutionStatusId,
          caseName: humanReview[0].caseName,
        }
      : null,
    sheetReviews,
  };
}
