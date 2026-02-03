import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { humanReviews } from "./schema";

export type HumanReviewRow = typeof humanReviews.$inferSelect;

export async function upsertHumanReview(data: {
  dryadDatasetId: number;
  verdict: "true_positive" | "false_positive" | "ambiguous";
  impactScore: number;
  notes: string | null;
}): Promise<HumanReviewRow> {
  const [result] = await db
    .insert(humanReviews)
    .values({
      dryadDatasetId: data.dryadDatasetId,
      verdict: data.verdict,
      impactScore: data.impactScore,
      notes: data.notes,
    })
    .onConflictDoUpdate({
      target: humanReviews.dryadDatasetId,
      set: {
        verdict: data.verdict,
        impactScore: data.impactScore,
        notes: data.notes,
        updatedAt: sql`NOW()`,
      },
    })
    .returning();
  return result;
}

export async function getHumanReviewByDatasetId(
  dryadDatasetId: number,
): Promise<HumanReviewRow | undefined> {
  const [result] = await db
    .select()
    .from(humanReviews)
    .where(eq(humanReviews.dryadDatasetId, dryadDatasetId));
  return result;
}
