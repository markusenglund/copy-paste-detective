import { and, desc, eq, gt, ne, sql, inArray } from "drizzle-orm";
import { db } from "../../db";
import { aiReviewResults } from "./schema";
import { dryadDatasets } from "../datasets/schema";
import type { DryadDataset } from "../datasets/datasetsRepository";
import { articles } from "../articles/schema";
import type { Article } from "../articles/schema";
import { pdfFiles } from "../pdfFiles/schema";
import type { PdfFile } from "../pdfFiles/schema";
import { dryadExcelFiles } from "../excelFiles/schema";
import type { DryadExcelFileRow } from "../excelFiles/excelFilesRepository";

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
  dryadDatasetId: number;
  dryadExcelFileId: number;
  sheetName: string;
  prompt: string;
  model: string;
  explanation: string;
  falsePositiveTheory: string;
  suspicionScore: number;
  impactScore: number;
  hash: string;
}): Promise<AiReviewResultRow> {
  const [inserted] = await db.insert(aiReviewResults).values(data).returning();
  return inserted;
}

/**
 * Get the latest AI review for each unique sheet, grouped by dataset ID.
 * A unique sheet is identified by (dryadExcelFileId, sheetName).
 * Returns a Map where keys are dryadDatasetId and values are arrays of the latest reviews for each sheet.
 */
export async function getLatestReviewsPerSheet(): Promise<
  Map<number, AiReviewResultRow[]>
> {
  // Fetch all reviews ordered by createdAt descending
  const allReviews = await db
    .select()
    .from(aiReviewResults)
    .orderBy(desc(aiReviewResults.createdAt));

  // Group by unique sheet (dryadExcelFileId + sheetName) and keep only the latest
  const latestBySheet = new Map<string, AiReviewResultRow>();
  for (const review of allReviews) {
    const sheetKey = `${review.dryadExcelFileId}:${review.sheetName}`;
    // Since we're ordered by createdAt desc, the first one we encounter is the latest
    if (!latestBySheet.has(sheetKey)) {
      latestBySheet.set(sheetKey, review);
    }
  }

  // Group latest reviews by dryadDatasetId
  const reviewsByDatasetId = new Map<number, AiReviewResultRow[]>();
  for (const review of latestBySheet.values()) {
    const existing = reviewsByDatasetId.get(review.dryadDatasetId) ?? [];
    existing.push(review);
    reviewsByDatasetId.set(review.dryadDatasetId, existing);
  }

  return reviewsByDatasetId;
}

/**
 * Get high-suspicion AI reviews with all associated data (articles, PDFs, datasets, excel files).
 * Filters for suspicionScore > threshold and pdfDownloadStatus = 'completed'.
 * Optionally filters by dataset extId.
 * Orders by suspicionScore DESC, impactScore DESC.
 */
export async function getHighSuspicionReviewsWithArticles(
  suspicionThreshold: number,
  limit: number,
  extId?: number,
): Promise<
  Array<{
    aiReview: AiReviewResultRow;
    article: Article;
    pdfFile: PdfFile;
    dataset: DryadDataset;
    excelFile: DryadExcelFileRow;
  }>
> {
  const whereConditions = [
    gt(aiReviewResults.suspicionScore, suspicionThreshold),
  ];

  if (extId !== undefined) {
    whereConditions.push(eq(dryadDatasets.extId, extId));
  }

  const results = await db
    .select({
      aiReview: aiReviewResults,
      article: articles,
      pdfFile: pdfFiles,
      dataset: dryadDatasets,
      excelFile: dryadExcelFiles,
    })
    .from(aiReviewResults)
    .innerJoin(
      dryadDatasets,
      eq(aiReviewResults.dryadDatasetId, dryadDatasets.id),
    )
    .innerJoin(articles, eq(dryadDatasets.id, articles.dryadDatasetId))
    .innerJoin(pdfFiles, eq(articles.id, pdfFiles.articleId))
    .innerJoin(
      dryadExcelFiles,
      eq(aiReviewResults.dryadExcelFileId, dryadExcelFiles.id),
    )
    .where(and(...whereConditions))
    .orderBy(
      desc(aiReviewResults.suspicionScore),
      desc(aiReviewResults.impactScore),
    )
    .limit(limit);

  return results;
}

// Hardcoded date threshold for pdf review - only consider reviews created after this date
const PDF_REVIEW_DATE_THRESHOLD = new Date("2026-01-01T00:00:00Z");

export type DatasetWithReviews = {
  dataset: DryadDataset;
  article: Article;
  pdfFile: PdfFile;
  reviews: Array<{
    aiReview: AiReviewResultRow;
    excelFile: DryadExcelFileRow;
  }>;
};

/**
 * Get datasets ready for PDF review with all associated data.
 *
 * This function:
 * 1. Finds datasets that haven't been pdf_reviewed_by_ai yet
 * 2. Have at least one high-suspicion review created after the date threshold
 * 3. For each dataset, returns only the latest review for each unique (excelFileId, sheetName) combo
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
    // When extId specified, just get that specific dataset
    const dataset = await db
      .select({ id: dryadDatasets.id })
      .from(dryadDatasets)
      .where(eq(dryadDatasets.extId, extId))
      .limit(1);

    datasetIds = dataset.map((d) => d.id);
  } else {
    // Find datasets that:
    // 1. Haven't been pdf_reviewed_by_ai yet
    // 2. Have at least one qualifying review (suspicion > threshold AND createdAt > date threshold)
    const hasQualifyingReview = sql<boolean>`EXISTS (
      SELECT 1 FROM ai_review_results arr
      INNER JOIN articles a ON a.dryad_dataset_id = arr.dryad_dataset_id
      INNER JOIN pdf_files pf ON pf.article_id = a.id
      WHERE arr.dryad_dataset_id = dryad_datasets.id
        AND arr.suspicion_score > ${suspicionThreshold}
        AND arr.created_at > ${PDF_REVIEW_DATE_THRESHOLD}
        AND a.pdf_download_status IN ('completed', 'manually_added')
    )`;

    const datasets = await db
      .select({ id: dryadDatasets.id })
      .from(dryadDatasets)
      .where(
        and(
          ne(dryadDatasets.analysisStatus, "pdf_reviewed_by_ai"),
          hasQualifyingReview,
        ),
      )
      .limit(limit);

    datasetIds = datasets.map((d) => d.id);
  }

  if (datasetIds.length === 0) {
    return [];
  }

  // Step 2: Get the latest review for each (datasetId, excelFileId, sheetName) combo
  // Using a subquery to find the max createdAt for each group
  const datasetIdList = sql.join(
    datasetIds.map((id) => sql`${id}`),
    sql`, `,
  );
  const latestReviewsSubquery = sql`(
    SELECT dryad_dataset_id, dryad_excel_file_id, sheet_name, MAX(created_at) as max_created_at
    FROM ai_review_results
    WHERE dryad_dataset_id IN (${datasetIdList})
      AND suspicion_score > ${suspicionThreshold}
      AND created_at > ${PDF_REVIEW_DATE_THRESHOLD}
    GROUP BY dryad_dataset_id, dryad_excel_file_id, sheet_name
  )`;

  // Step 3: Join to get full review records with article and PDF data
  const reviews = await db
    .select({
      aiReview: aiReviewResults,
      article: articles,
      pdfFile: pdfFiles,
      dataset: dryadDatasets,
      excelFile: dryadExcelFiles,
    })
    .from(aiReviewResults)
    .innerJoin(
      sql`${latestReviewsSubquery} latest`,
      sql`ai_review_results.dryad_dataset_id = latest.dryad_dataset_id
          AND ai_review_results.dryad_excel_file_id = latest.dryad_excel_file_id
          AND ai_review_results.sheet_name = latest.sheet_name
          AND ai_review_results.created_at = latest.max_created_at`,
    )
    .innerJoin(
      dryadDatasets,
      eq(aiReviewResults.dryadDatasetId, dryadDatasets.id),
    )
    .innerJoin(articles, eq(dryadDatasets.id, articles.dryadDatasetId))
    .innerJoin(pdfFiles, eq(articles.id, pdfFiles.articleId))
    .innerJoin(
      dryadExcelFiles,
      eq(aiReviewResults.dryadExcelFileId, dryadExcelFiles.id),
    )
    .where(
      and(
        inArray(aiReviewResults.dryadDatasetId, datasetIds),
        inArray(articles.pdfDownloadStatus, ["completed", "manually_added"]),
      ),
    )
    .orderBy(
      desc(aiReviewResults.suspicionScore),
      desc(aiReviewResults.impactScore),
    );

  // Step 4: Group reviews by dataset
  const reviewsByDatasetId = new Map<
    number,
    Array<{
      aiReview: AiReviewResultRow;
      excelFile: DryadExcelFileRow;
    }>
  >();
  const datasetInfoById = new Map<
    number,
    { dataset: DryadDataset; article: Article; pdfFile: PdfFile }
  >();

  for (const row of reviews) {
    const datasetId = row.dataset.id;
    datasetInfoById.set(datasetId, {
      dataset: row.dataset,
      article: row.article,
      pdfFile: row.pdfFile,
    });

    const existing = reviewsByDatasetId.get(datasetId) ?? [];
    existing.push({
      aiReview: row.aiReview,
      excelFile: row.excelFile,
    });
    reviewsByDatasetId.set(datasetId, existing);
  }

  // Build result array, preserving dataset order from the original query
  const result: DatasetWithReviews[] = [];
  for (const datasetId of datasetIds) {
    const info = datasetInfoById.get(datasetId);
    const datasetReviews = reviewsByDatasetId.get(datasetId);

    // Only include datasets that have reviews (after all the joins)
    if (info && datasetReviews && datasetReviews.length > 0) {
      result.push({
        dataset: info.dataset,
        article: info.article,
        pdfFile: info.pdfFile,
        reviews: datasetReviews,
      });
    }
  }

  return result;
}
