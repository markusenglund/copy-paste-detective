import { eq } from "drizzle-orm";
import { db } from "../../db";
import { aiMetaAnalysisResults } from "./schema";

export type AiMetaAnalysisResultRow = typeof aiMetaAnalysisResults.$inferSelect;

export async function findByHash(
  hash: string,
): Promise<AiMetaAnalysisResultRow | null> {
  const results = await db
    .select()
    .from(aiMetaAnalysisResults)
    .where(eq(aiMetaAnalysisResults.hash, hash))
    .limit(1);
  return results[0] ?? null;
}

export async function insertResult(data: {
  dryadDatasetId?: number;
  datasetId?: number;
  prompt: string;
  model: string;
  reasoning: string;
  isMetaAnalysis: boolean;
  hash: string;
}): Promise<AiMetaAnalysisResultRow> {
  const [inserted] = await db
    .insert(aiMetaAnalysisResults)
    .values(data)
    .returning();
  return inserted;
}
