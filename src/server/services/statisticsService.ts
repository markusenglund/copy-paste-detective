import { db } from "../../db";
import { dryadDatasets } from "../../repositories/datasets/schema";
import { dryadExcelFiles } from "../../repositories/excelFiles/schema";
import { articles } from "../../repositories/articles/schema";
import { pdfFiles } from "../../repositories/pdfFiles/schema";
import { aiReviewResults } from "../../repositories/aiReviewResults/schema";
import { aiPdfReviewResults } from "../../repositories/aiPdfReviewResults/schema";
import { humanReviews } from "../../repositories/humanReview/schema";
import { sql, eq, and, gt, inArray } from "drizzle-orm";
import {
  AI_REVIEW_MIN_DATE,
  PDF_REVIEW_MIN_DATE,
} from "../../repositories/aiReviewResults/aiReviewResultsRepository";
import type { StatisticsResponse } from "../../shared/statisticsTypes";

export const SUSPICION_THRESHOLD = 0.5;

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

  // 4. Step 3: AI Review Status
  // Find all datasets with at least one non-obsolete ai_review_result
  const allReviewedDatasetsResult = await db
    .selectDistinct({ datasetId: aiReviewResults.dryadDatasetId })
    .from(aiReviewResults)
    .where(gt(aiReviewResults.createdAt, AI_REVIEW_MIN_DATE));

  const allReviewedDatasetIds = allReviewedDatasetsResult.map(
    (r) => r.datasetId,
  );
  const totalAiReviewed = allReviewedDatasetIds.length;

  // Find datasets with suspicious reviews (>50%) - only considering latest review per sheet
  const suspiciousDatasetIdsResult = await db
    .selectDistinct({ datasetId: aiReviewResults.dryadDatasetId })
    .from(aiReviewResults)
    .where(
      and(
        eq(aiReviewResults.isLatestReview, true),
        gt(aiReviewResults.createdAt, AI_REVIEW_MIN_DATE),
        gt(aiReviewResults.truePositiveProbability, SUSPICION_THRESHOLD),
      ),
    );

  const suspiciousDatasetIds = suspiciousDatasetIdsResult.map(
    (r) => r.datasetId,
  );
  const totalSuspicious = suspiciousDatasetIds.length;
  const totalNotSuspicious = totalAiReviewed - totalSuspicious;

  const aiReviewStatus = {
    total: totalAiReviewed,
    breakdown: {
      suspicious: totalSuspicious,
      notSuspicious: totalNotSuspicious,
    },
  };

  // 5. Step 4: PDF Pipeline (for suspicious datasets)
  let suspiciousWithoutArticles = 0;
  let pdfNotDownloaded = 0;
  let pdfDownloadedNotReviewed = 0;
  let pdfReviewedHighImpact = 0;
  let pdfReviewedLowImpact = 0;
  let humanReviewTruePositiveHighImpact = 0;
  let humanReviewTruePositiveLowImpact = 0;
  let humanReviewAmbiguous = 0;
  let humanReviewFalsePositive = 0;
  let humanReviewNotReviewed = 0;

  if (totalSuspicious > 0) {
    // Count suspicious datasets with NO article at all
    const withoutArticleResult = await db
      .select({ count: sql<number>`count(distinct ${dryadDatasets.id})::int` })
      .from(dryadDatasets)
      .leftJoin(articles, eq(articles.dryadDatasetId, dryadDatasets.id))
      .where(
        and(
          inArray(dryadDatasets.id, suspiciousDatasetIds),
          sql`${articles.id} IS NULL`,
        ),
      );

    suspiciousWithoutArticles = withoutArticleResult[0]?.count ?? 0;

    // Count suspicious datasets with article but no PDF
    const withArticleNoPdfResult = await db
      .select({ count: sql<number>`count(distinct ${dryadDatasets.id})::int` })
      .from(dryadDatasets)
      .innerJoin(articles, eq(articles.dryadDatasetId, dryadDatasets.id))
      .leftJoin(pdfFiles, eq(pdfFiles.articleId, articles.id))
      .where(
        and(
          inArray(dryadDatasets.id, suspiciousDatasetIds),
          sql`${pdfFiles.id} IS NULL`,
        ),
      );

    pdfNotDownloaded = withArticleNoPdfResult[0]?.count ?? 0;

    // Count suspicious datasets with PDF but at least one latest review without PDF review
    const withPdfNoReviewResult = await db
      .select({ count: sql<number>`count(distinct ${dryadDatasets.id})::int` })
      .from(dryadDatasets)
      .innerJoin(articles, eq(articles.dryadDatasetId, dryadDatasets.id))
      .innerJoin(pdfFiles, eq(pdfFiles.articleId, articles.id))
      .where(
        and(
          inArray(dryadDatasets.id, suspiciousDatasetIds),
          // At least one latest review for this dataset has no PDF review
          sql`EXISTS (
            SELECT 1
            FROM ai_review_results arr
            LEFT JOIN ai_pdf_review_results pdfr ON (
              pdfr.ai_review_result_id = arr.id
              AND pdfr.created_at >= ${PDF_REVIEW_MIN_DATE}
            )
            WHERE arr.dryad_dataset_id = dryad_datasets.id
              AND arr.is_latest_review = true
              AND arr.true_positive_probability > ${SUSPICION_THRESHOLD}
              AND arr.created_at > ${AI_REVIEW_MIN_DATE}
              AND pdfr.id IS NULL
          )`,
        ),
      );

    pdfDownloadedNotReviewed = withPdfNoReviewResult[0]?.count ?? 0;

    // PDF review breakdown by impact score
    // Only count datasets where ALL latest reviews have PDF reviews
    // For each dataset, take the MAXIMUM impact score across all its latest reviews
    const impactBreakdownResult = await db
      .select({
        datasetId: dryadDatasets.id,
        maxImpact: sql<number>`MAX(${aiPdfReviewResults.impactScore})::int`,
      })
      .from(dryadDatasets)
      .innerJoin(articles, eq(articles.dryadDatasetId, dryadDatasets.id))
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
          inArray(articles.pdfDownloadStatus, ["completed", "manually_added"]),
          eq(aiReviewResults.isLatestReview, true),
          gt(aiReviewResults.createdAt, AI_REVIEW_MIN_DATE),
          gt(aiReviewResults.truePositiveProbability, SUSPICION_THRESHOLD),
          gt(aiPdfReviewResults.createdAt, PDF_REVIEW_MIN_DATE),
          // Exclude datasets that have at least one latest review without PDF review
          sql`NOT EXISTS (
            SELECT 1
            FROM ai_review_results arr2
            LEFT JOIN ai_pdf_review_results pdfr2 ON (
              pdfr2.ai_review_result_id = arr2.id
              AND pdfr2.created_at >= ${PDF_REVIEW_MIN_DATE}
            )
            WHERE arr2.dryad_dataset_id = ${dryadDatasets.id}
              AND arr2.is_latest_review = true
              AND arr2.true_positive_probability > ${SUSPICION_THRESHOLD}
              AND arr2.created_at > ${AI_REVIEW_MIN_DATE}
              AND pdfr2.id IS NULL
          )`,
        ),
      )
      .groupBy(dryadDatasets.id);

    // Split by impact score
    const highImpactDatasets = impactBreakdownResult.filter(
      (r) => r.maxImpact >= 3,
    );
    pdfReviewedHighImpact = highImpactDatasets.length;
    pdfReviewedLowImpact = impactBreakdownResult.filter(
      (r) => r.maxImpact <= 2,
    ).length;

    // 6. Step 5: Human Review Status (for high-impact datasets)
    if (highImpactDatasets.length > 0) {
      const highImpactDatasetIds = highImpactDatasets.map((r) => r.datasetId);

      const humanReviewResults = await db
        .select({
          verdict: humanReviews.verdict,
          impactScore: humanReviews.impactScore,
        })
        .from(humanReviews)
        .where(
          and(
            inArray(humanReviews.dryadDatasetId, highImpactDatasetIds),
            eq(humanReviews.isLatestReview, true),
          ),
        );

      for (const row of humanReviewResults) {
        if (row.verdict === "true_positive") {
          if (row.impactScore >= 3) {
            humanReviewTruePositiveHighImpact++;
          } else {
            humanReviewTruePositiveLowImpact++;
          }
        } else if (row.verdict === "ambiguous") {
          humanReviewAmbiguous++;
        } else if (row.verdict === "false_positive") {
          humanReviewFalsePositive++;
        }
      }

      humanReviewNotReviewed =
        pdfReviewedHighImpact -
        (humanReviewTruePositiveHighImpact +
          humanReviewTruePositiveLowImpact +
          humanReviewAmbiguous +
          humanReviewFalsePositive);
    }
  }

  const pdfPipeline = {
    suspiciousWithoutArticles,
    pdfNotDownloaded,
    pdfDownloadedNotReviewed,
    pdfReviewedHighImpact,
    pdfReviewedLowImpact,
  };

  // 7. Calculate percentages for funnel visualization
  const totalFlagged = flagged + reviewedByAi + pdfReviewedByAi;
  const percentages = {
    downloadedOfIndexed:
      totalDatasets > 0
        ? Math.round((downloadStatus.completed / totalDatasets) * 100)
        : 0,
    analyzedOfDownloaded:
      downloadStatus.completed > 0
        ? Math.round((analysisStatus.analyzed / downloadStatus.completed) * 100)
        : 0,
    aiReviewedOfAnalyzed:
      totalFlagged > 0 ? Math.round((totalSuspicious / totalFlagged) * 100) : 0,
    pdfReviewedOfSuspicious:
      totalSuspicious > 0
        ? Math.round((pdfReviewedHighImpact / totalSuspicious) * 100)
        : 0,
    humanConfirmedOfHighImpact:
      pdfReviewedHighImpact > 0
        ? Math.round(
            (humanReviewTruePositiveHighImpact / pdfReviewedHighImpact) * 100,
          )
        : 0,
  };

  const humanReviewStatus = {
    truePositiveHighImpact: humanReviewTruePositiveHighImpact,
    truePositiveLowImpact: humanReviewTruePositiveLowImpact,
    ambiguous: humanReviewAmbiguous,
    falsePositive: humanReviewFalsePositive,
    notReviewed: humanReviewNotReviewed,
  };

  return {
    totalDatasets,
    totalExcelFiles,
    totalArticles,
    downloadStatus,
    analysisStatus,
    aiReviewStatus,
    pdfPipeline,
    humanReviewStatus,
    percentages,
  };
}
