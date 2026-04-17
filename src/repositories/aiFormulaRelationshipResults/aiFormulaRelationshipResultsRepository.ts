import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  aiFormulaRelationshipResults,
  type AiFormulaRelationshipResultRow,
  type FormulaRelationship,
} from "./schema";

export async function findByHash(
  hash: string,
): Promise<AiFormulaRelationshipResultRow | null> {
  const results = await db
    .select()
    .from(aiFormulaRelationshipResults)
    .where(eq(aiFormulaRelationshipResults.hash, hash))
    .limit(1);
  return results[0] ?? null;
}

export async function insertResult(data: {
  datasetId?: number;
  datasetFileId?: number;
  sheetName: string;
  prompt: string;
  model: string;
  relationships: FormulaRelationship[];
  hash: string;
}): Promise<AiFormulaRelationshipResultRow> {
  const [inserted] = await db
    .insert(aiFormulaRelationshipResults)
    .values(data)
    .returning();
  return inserted;
}
