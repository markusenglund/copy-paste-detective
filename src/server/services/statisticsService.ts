import { db } from "../../db";
import { dryadDatasets } from "../../repositories/datasets/schema";
import { dryadExcelFiles } from "../../repositories/excelFiles/schema";
import { articles } from "../../repositories/articles/schema";
import { pdfFiles } from "../../repositories/pdfFiles/schema";
import { aiReviewResults } from "../../repositories/aiReviewResults/schema";
import { aiPdfReviewResults } from "../../repositories/aiPdfReviewResults/schema";
import { sql, eq, and, gt, inArray } from "drizzle-orm";
import {
  AI_REVIEW_MIN_DATE,
  PDF_REVIEW_MIN_DATE,
} from "../../repositories/aiReviewResults/aiReviewResultsRepository";
import type { StatisticsResponse } from "../../shared/statisticsTypes";

export async function getStatistics(): Promise<StatisticsResponse> {
  // 1. Get basic counts in parallel
  const [totalDatasetsResult, totalExcelFilesResult, totalArticlesResult] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(dryadDatasets),
      db.select({ count: sql<number>`count(*)::int` }).from(dryadExcelFiles),
      db.select({ count: sql<number>`count(*)::int` }).from(articles),
    ]);

  const totalDatasets = totalDatasetsResult[0]?.count ?? 0;
  const totalExcelFiles = totalExcelFilesResult[0]?.count ?? 0;
  const totalArticles = totalArticlesResult[0]?.count ?? 0;

  // 2. Get download status breakdown
  const downloadBreakdownResults = await db
    .select({
      status: dryadDatasets.downloadStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(dryadDatasets)
    .groupBy(dryadDatasets.downloadStatus);

  const downloadStatusMap = new Map(
    downloadBreakdownResults.map((r) => [r.status, r.count]),
  );

  const downloadStatus = {
    completed: downloadStatusMap.get("completed") ?? 0,
    failed:
      (downloadStatusMap.get("failed") ?? 0) +
      (downloadStatusMap.get("api_forbidden") ?? 0) +
      (downloadStatusMap.get("api_not_found") ?? 0),
    notStarted: downloadStatusMap.get("not_started") ?? 0,
    inProgress: downloadStatusMap.get("in_progress") ?? 0,
    skipped:
      (downloadStatusMap.get("skipped") ?? 0) +
      (downloadStatusMap.get("manually_added") ?? 0),
  };

  // 3. Get analysis status breakdown (only from downloaded datasets)
  const analysisBreakdownResults = await db
    .select({
      status: dryadDatasets.analysisStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(dryadDatasets)
    .where(eq(dryadDatasets.downloadStatus, "completed"))
    .groupBy(dryadDatasets.analysisStatus);

  const analysisStatusMap = new Map(
    analysisBreakdownResults.map((r) => [r.status, r.count]),
  );

  const notFlagged = analysisStatusMap.get("not_flagged_for_review") ?? 0;
  const flagged = analysisStatusMap.get("flagged_for_review") ?? 0;
  const reviewedByAi = analysisStatusMap.get("reviewed_by_ai") ?? 0;
  const pdfReviewedByAi = analysisStatusMap.get("pdf_reviewed_by_ai") ?? 0;
  const failed = analysisStatusMap.get("failed") ?? 0;
  const notAnalyzed = analysisStatusMap.get("not_analyzed") ?? 0;

  const analysisStatus = {
    analyzed: notFlagged + flagged + reviewedByAi + pdfReviewedByAi,
    breakdown: {
      notFlagged,
      flagged,
      reviewedByAi,
      pdfReviewedByAi,
    },
    failed,
    notAnalyzed,
  };

  // 4. Get suspicious datasets pipeline
  // Find datasets with suspicious reviews (MUST filter by AI_REVIEW_MIN_DATE)
  const suspiciousDatasetIdsResult = await db
    .selectDistinct({ datasetId: aiReviewResults.dryadDatasetId })
    .from(aiReviewResults)
    .where(
      and(
        gt(aiReviewResults.truePositiveProbability, 0.5),
        gt(aiReviewResults.createdAt, AI_REVIEW_MIN_DATE),
      ),
    );

  const suspiciousDatasetIds = suspiciousDatasetIdsResult.map(
    (r) => r.datasetId,
  );
  const totalSuspicious = suspiciousDatasetIds.length;

  let suspiciousWithArticle = 0;
  let suspiciousWithPdf = 0;
  let pdfReviewed = 0;
  let highImpact = 0;
  let lowImpact = 0;

  if (totalSuspicious > 0) {
    // Count those with articles
    const withArticleResult = await db
      .select({ count: sql<number>`count(distinct ${dryadDatasets.id})::int` })
      .from(dryadDatasets)
      .innerJoin(articles, eq(articles.dryadDatasetId, dryadDatasets.id))
      .where(inArray(dryadDatasets.id, suspiciousDatasetIds));

    suspiciousWithArticle = withArticleResult[0]?.count ?? 0;

    // Count those with PDFs
    const withPdfResult = await db
      .select({ count: sql<number>`count(distinct ${dryadDatasets.id})::int` })
      .from(dryadDatasets)
      .innerJoin(articles, eq(articles.dryadDatasetId, dryadDatasets.id))
      .innerJoin(pdfFiles, eq(pdfFiles.articleId, articles.id))
      .where(inArray(dryadDatasets.id, suspiciousDatasetIds));

    suspiciousWithPdf = withPdfResult[0]?.count ?? 0;

    // Count PDF reviewed datasets (MUST filter by PDF_REVIEW_MIN_DATE)
    const pdfReviewedResult = await db
      .select({ count: sql<number>`count(distinct ${dryadDatasets.id})::int` })
      .from(dryadDatasets)
      .innerJoin(
        aiReviewResults,
        eq(aiReviewResults.dryadDatasetId, dryadDatasets.id),
      )
      .innerJoin(
        aiPdfReviewResults,
        eq(aiPdfReviewResults.aiReviewResultId, aiReviewResults.id),
      )
      .where(
        and(
          inArray(dryadDatasets.id, suspiciousDatasetIds),
          gt(aiReviewResults.truePositiveProbability, 0.5),
          gt(aiReviewResults.createdAt, AI_REVIEW_MIN_DATE),
          gt(aiPdfReviewResults.createdAt, PDF_REVIEW_MIN_DATE),
        ),
      );

    pdfReviewed = pdfReviewedResult[0]?.count ?? 0;

    // PDF review breakdown by impact score (MUST filter by both date thresholds)
    const impactBreakdownResult = await db
      .select({
        highImpact: sql<number>`count(*) filter (where ${aiPdfReviewResults.impactScore} >= 3)::int`,
        lowImpact: sql<number>`count(*) filter (where ${aiPdfReviewResults.impactScore} <= 2)::int`,
      })
      .from(aiPdfReviewResults)
      .innerJoin(
        aiReviewResults,
        eq(aiPdfReviewResults.aiReviewResultId, aiReviewResults.id),
      )
      .where(
        and(
          inArray(aiReviewResults.dryadDatasetId, suspiciousDatasetIds),
          gt(aiReviewResults.truePositiveProbability, 0.5),
          gt(aiReviewResults.createdAt, AI_REVIEW_MIN_DATE),
          gt(aiPdfReviewResults.createdAt, PDF_REVIEW_MIN_DATE),
        ),
      );

    highImpact = impactBreakdownResult[0]?.highImpact ?? 0;
    lowImpact = impactBreakdownResult[0]?.lowImpact ?? 0;
  }

  const suspiciousDatasets = {
    total: totalSuspicious,
    withArticle: suspiciousWithArticle,
    withPdf: suspiciousWithPdf,
    pdfReviewed,
    pdfReviewBreakdown: {
      highImpact,
      lowImpact,
    },
  };

  // 5. Calculate percentages for funnel visualization
  const percentages = {
    downloadedOfIndexed:
      totalDatasets > 0
        ? Math.round((downloadStatus.completed / totalDatasets) * 100)
        : 0,
    analyzedOfDownloaded:
      downloadStatus.completed > 0
        ? Math.round((analysisStatus.analyzed / downloadStatus.completed) * 100)
        : 0,
    flaggedOfAnalyzed:
      analysisStatus.analyzed > 0
        ? Math.round(
            ((analysisStatus.breakdown.flagged +
              analysisStatus.breakdown.reviewedByAi +
              analysisStatus.breakdown.pdfReviewedByAi) /
              analysisStatus.analyzed) *
              100,
          )
        : 0,
    pdfReviewedOfFlagged:
      totalSuspicious > 0
        ? Math.round((pdfReviewed / totalSuspicious) * 100)
        : 0,
  };

  return {
    totalDatasets,
    totalExcelFiles,
    totalArticles,
    downloadStatus,
    analysisStatus,
    suspiciousDatasets,
    percentages,
  };
}
