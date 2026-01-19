import { eq } from "drizzle-orm";
import { db } from "../../db";
import { aiPdfReviewResults } from "./schema";

// Re-export types for convenience
export type AiPdfReviewResultRow = typeof aiPdfReviewResults.$inferSelect;

export async function findByHash(
  hash: string,
): Promise<AiPdfReviewResultRow | null> {
  const results = await db
    .select()
    .from(aiPdfReviewResults)
    .where(eq(aiPdfReviewResults.hash, hash))
    .limit(1);
  return results[0] ?? null;
}

export async function insertResult(data: {
  aiReviewResultId: number;
  articleId: number;
  prompt: string;
  model: string;
  impactScore: number;
  response: string;
  hash: string;
}): Promise<AiPdfReviewResultRow> {
  const [inserted] = await db
    .insert(aiPdfReviewResults)
    .values(data)
    .returning();
  return inserted;
}

export async function findByAiReviewResultId(
  id: number,
): Promise<AiPdfReviewResultRow | null> {
  const results = await db
    .select()
    .from(aiPdfReviewResults)
    .where(eq(aiPdfReviewResults.aiReviewResultId, id))
    .limit(1);
  return results[0] ?? null;
}
