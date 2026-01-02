import { desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { aiReviewResults } from "./schema";

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
  const [inserted] = await db
    .insert(aiReviewResults)
    .values(data)
    .returning();
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

