import { and, desc, eq, gt, sql, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { aiReviewResults } from "./schema";
import { datasets } from "../datasets/unifiedSchema";

import type { DatasetRow } from "../datasets/unifiedDatasetsRepository";
import { articles } from "../articles/schema";
import type { Article } from "../articles/schema";
import { datasetFiles } from "../datasetFiles/schema";
import type { DatasetFileRow } from "../datasets/unifiedDatasetsRepository";
import { logger } from "../../utils/logger";

// Hardcoded date threshold that reviews must been created after to be considered not obsolete.
export const AI_REVIEW_MIN_DATE = new Date("2026-01-27T00:00:00Z");

// Date threshold for PDF reviews - reviews created before this are considered obsolete
export const PDF_REVIEW_MIN_DATE = new Date("2026-01-26T00:00:00Z");

// Re-export types for convenience
export type AiReviewResultRow = typeof aiReviewResults.$inferSelect;

export async function findByHash(
  hash: string,
): Promise<AiReviewResultRow | null> {
  const results = await db
    .select()
    .from(aiReviewResults)
    .where(eq(aiReviewResults.hash, hash))
    .limit(1);
  return results[0] ?? null;
}

export async function insertResult(data: {
  datasetId?: number;
  datasetFileId?: number;
  sheetName: string;
  prompt: string;
  model: string;
  response: string;
  truePositiveProbability: number;
  hash: string;
}): Promise<AiReviewResultRow> {
  return await db.transaction(async (tx) => {
    // Step 1: Set is_latest_review = false for existing "latest" review of this sheet
    // This is required before inserting the new one due to the unique constraint
    if (data.datasetFileId != null) {
      await tx
        .update(aiReviewResults)
        .set({ isLatestReview: false })
        .where(
          and(
            eq(aiReviewResults.datasetFileId, data.datasetFileId),
            eq(aiReviewResults.sheetName, data.sheetName),
            eq(aiReviewResults.isLatestReview, true),
          ),
        );
    }

    // Step 2: Insert new review with is_latest_review = true
    // If step 1 didn't run (bug), the unique index will reject this insert
    const [inserted] = await tx
      .insert(aiReviewResults)
      .values({
        ...data,
        isLatestReview: true,
      })
      .returning();

    return inserted;
  });
}

/**
 * Get the latest AI review for each unique sheet, grouped by dataset ID.
 * A unique sheet is identified by (datasetFileId, sheetName).
 * Returns a Map where keys are datasetId and values are arrays of the latest reviews for each sheet.
 */
export async function getLatestReviewsPerSheet(): Promise<
  Map<number, AiReviewResultRow[]>
> {
  // Fetch all latest reviews using the is_latest_review flag
  const latestReviews = await db
    .select()
    .from(aiReviewResults)
    .where(
      and(
        eq(aiReviewResults.isLatestReview, true),
        gt(aiReviewResults.createdAt, AI_REVIEW_MIN_DATE),
      ),
    )
    .orderBy(desc(aiReviewResults.createdAt));

  // Group latest reviews by datasetId (skip reviews without one)
  const reviewsByDatasetId = new Map<number, AiReviewResultRow[]>();
  for (const review of latestReviews) {
    const id = review.datasetId;
    if (id == null) continue;
    const existing = reviewsByDatasetId.get(id) ?? [];
    existing.push(review);
    reviewsByDatasetId.set(id, existing);
  }

  return reviewsByDatasetId;
}

/**
 * Get high-suspicion AI reviews with all associated data (articles, PDFs, datasets, files).
 * Filters for truePositiveProbability > threshold.
 * Optionally filters by dataset extId.
 * Orders by truePositiveProbability DESC.
 */
export async function getHighSuspicionReviewsWithArticles(
  suspicionThreshold: number,
  limit: number,
  extId?: number,
): Promise<
  Array<{
    aiReview: AiReviewResultRow;
    article: Article;
    dataset: DatasetRow;
    datasetFile: DatasetFileRow;
  }>
> {
  const whereConditions = [
    eq(aiReviewResults.isLatestReview, true),
    gt(aiReviewResults.truePositiveProbability, suspicionThreshold),
    gt(aiReviewResults.createdAt, AI_REVIEW_MIN_DATE),
  ];

  if (extId !== undefined) {
    whereConditions.push(sql`${datasets.extId} = ${extId.toString()}`);
  }

  const results = await db
    .select({
      aiReview: aiReviewResults,
      article: articles,
      dataset: datasets,
      datasetFile: datasetFiles,
    })
    .from(aiReviewResults)
    .innerJoin(datasets, eq(aiReviewResults.datasetId, datasets.id))
    .innerJoin(articles, eq(datasets.articleId, articles.id))
    .innerJoin(datasetFiles, eq(aiReviewResults.datasetFileId, datasetFiles.id))
    .where(and(...whereConditions))
    .orderBy(desc(aiReviewResults.truePositiveProbability))
    .limit(limit);

  return results;
}

export type DatasetWithReviews = {
  dataset: DatasetRow;
  article: Article;
  pdfFile: DatasetFileRow;
  reviews: Array<{
    aiReview: AiReviewResultRow;
    datasetFile: DatasetFileRow;
  }>;
};

/**
 * Get datasets ready for PDF review with all associated data.
 *
 * This function:
 * 1. Finds datasets that don't have a recent (non-obsolete) PDF review
 * 2. Have at least one high-suspicion review created after the date threshold
 * 3. For each dataset, returns only the latest review for each unique (datasetFileId, sheetName) combo
 * 4. Includes article and PDF data (only articles with completed PDF downloads)
 *
 * When extId is provided, only returns that specific dataset (ignoring limit).
 */
export async function getDatasetsForPdfReview(
  suspicionThreshold: number,
  limit: number,
  extId?: number,
): Promise<DatasetWithReviews[]> {
  // Step 1: Find dataset IDs that match our criteria
  let datasetIds: number[];

  if (extId !== undefined) {
    // When extId specified, just get that specific dataset using the unified extId
    const dataset = await db
      .select({ id: datasets.id })
      .from(datasets)
      .where(sql`${datasets.extId} = ${extId.toString()}`)
      .limit(1);

    datasetIds = dataset.map((d) => d.id);
  } else {
    // Check if dataset has at least one latest suspicious review WITHOUT a PDF review
    const hasLatestReviewWithoutPdfReview = sql<boolean>`EXISTS (
      SELECT 1
      FROM ai_review_results arr
      LEFT JOIN ai_pdf_review_results pdfr ON (
        pdfr.ai_review_result_id = arr.id
        AND pdfr.created_at >= ${PDF_REVIEW_MIN_DATE}
      )
      WHERE arr.dataset_id = ${datasets.id}
        AND arr.is_latest_review = true
        AND arr.true_positive_probability > ${suspicionThreshold}
        AND arr.created_at > ${AI_REVIEW_MIN_DATE}
        AND pdfr.id IS NULL
    )`;

    const hasReadyPdf = sql<boolean>`EXISTS (
      SELECT 1 FROM dataset_files df
      WHERE df.dataset_id = ${datasets.id}
        AND df.file_type = 'pdf'
        AND df.download_status IN ('completed', 'manually_added')
    )`;

    const matchedDatasets = await db
      .select({ id: datasets.id })
      .from(datasets)
      .where(and(hasLatestReviewWithoutPdfReview, hasReadyPdf))
      .limit(limit);

    datasetIds = matchedDatasets.map((d) => d.id);
  }

  logger.debug(
    `Get datasets step 1: Found ${datasetIds.length} datasets with high-suspicion reviews`,
  );

  if (datasetIds.length === 0) {
    return [];
  }

  const pdfDatasetFiles = alias(datasetFiles, "pdf_dataset_files");

  // Step 2: Get the latest review for each sheet using is_latest_review flag
  const excelDatasetFiles = alias(datasetFiles, "excel_dataset_files");
  const reviews = await db
    .select({
      aiReview: aiReviewResults,
      article: articles,
      pdfFile: pdfDatasetFiles,
      dataset: datasets,
      datasetFile: excelDatasetFiles,
    })
    .from(aiReviewResults)
    .innerJoin(datasets, eq(aiReviewResults.datasetId, datasets.id))
    .innerJoin(articles, eq(datasets.articleId, articles.id))
    .leftJoin(
      pdfDatasetFiles,
      and(
        eq(datasets.id, pdfDatasetFiles.datasetId),
        eq(pdfDatasetFiles.fileType, "pdf"),
        eq(pdfDatasetFiles.isMainArticle, true),
      ),
    )
    .innerJoin(
      excelDatasetFiles,
      eq(aiReviewResults.datasetFileId, excelDatasetFiles.id),
    )
    .where(
      and(
        inArray(aiReviewResults.datasetId, datasetIds),
        eq(aiReviewResults.isLatestReview, true),
        gt(aiReviewResults.truePositiveProbability, suspicionThreshold),
        gt(aiReviewResults.createdAt, AI_REVIEW_MIN_DATE),
      ),
    )
    .orderBy(desc(aiReviewResults.truePositiveProbability));

  logger.debug(`Get datasets step 2: Found ${reviews.length} reviews`);

  // Step 3: Group reviews by dataset
  const reviewsByDatasetId = new Map<
    number,
    Array<{
      aiReview: AiReviewResultRow;
      datasetFile: DatasetFileRow;
    }>
  >();
  const datasetInfoById = new Map<
    number,
    {
      dataset: DatasetRow;
      article: Article;
      pdfFile: DatasetFileRow | null;
    }
  >();

  for (const row of reviews) {
    const dsId = row.dataset.id;
    datasetInfoById.set(dsId, {
      dataset: row.dataset,
      article: row.article,
      pdfFile: row.pdfFile,
    });

    const existing = reviewsByDatasetId.get(dsId) ?? [];
    existing.push({
      aiReview: row.aiReview,
      datasetFile: row.datasetFile,
    });
    reviewsByDatasetId.set(dsId, existing);
  }

  // Build result array, preserving dataset order from the original query
  const result: DatasetWithReviews[] = [];
  for (const dsId of datasetIds) {
    const info = datasetInfoById.get(dsId);
    const datasetReviews = reviewsByDatasetId.get(dsId);
    // Only include datasets that have reviews and a PDF file (after all the joins)
    if (info && info.pdfFile && datasetReviews && datasetReviews.length > 0) {
      result.push({
        dataset: info.dataset,
        article: info.article,
        pdfFile: info.pdfFile,
        reviews: datasetReviews,
      });
    }
  }

  logger.debug(`Get datasets: Found ${result.length} datasets with reviews`);

  return result;
}
