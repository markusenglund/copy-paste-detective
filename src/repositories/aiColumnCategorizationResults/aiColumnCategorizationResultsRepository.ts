import { eq } from "drizzle-orm";
import { db } from "../../db";
import { aiColumnCategorizationResults } from "./schema";

// Re-export types for convenience
export type AiColumnCategorizationResultRow =
  typeof aiColumnCategorizationResults.$inferSelect;

export async function findByHash(
  hash: string,
): Promise<AiColumnCategorizationResultRow | null> {
  const results = await db
    .select()
    .from(aiColumnCategorizationResults)
    .where(eq(aiColumnCategorizationResults.hash, hash))
    .limit(1);
  return results[0] ?? null;
}

export async function insertResult(data: {
  dryadDatasetId: number;
  dryadExcelFileId: number;
  sheetName: string;
  prompt: string;
  model: string;
  motivation: string;
  includedColumnNames: string[];
  excludedColumnNames: string[];
  hash: string;
}): Promise<AiColumnCategorizationResultRow> {
  const [inserted] = await db
    .insert(aiColumnCategorizationResults)
    .values(data)
    .returning();
  return inserted;
}

