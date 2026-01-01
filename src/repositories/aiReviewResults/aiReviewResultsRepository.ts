import { eq } from "drizzle-orm";
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

