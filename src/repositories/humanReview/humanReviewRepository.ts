import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { humanReviews, prosecutionStatuses } from "./schema";

export type HumanReviewRow = typeof humanReviews.$inferSelect;
export type ProsecutionStatusRow = typeof prosecutionStatuses.$inferSelect;

export async function upsertHumanReview(data: {
  dryadDatasetId: number;
  verdict: "true_positive" | "false_positive" | "ambiguous";
  impactScore: number;
  notes: string | null;
  prosecutionStatusId: string;
}): Promise<HumanReviewRow> {
  const [result] = await db
    .insert(humanReviews)
    .values({
      dryadDatasetId: data.dryadDatasetId,
      verdict: data.verdict,
      impactScore: data.impactScore,
      notes: data.notes,
      prosecutionStatusId: data.prosecutionStatusId,
    })
    .onConflictDoUpdate({
      target: humanReviews.dryadDatasetId,
      set: {
        verdict: data.verdict,
        impactScore: data.impactScore,
        notes: data.notes,
        prosecutionStatusId: data.prosecutionStatusId,
        updatedAt: sql`NOW()`,
      },
    })
    .returning();
  return result;
}

export async function getAllProsecutionStatuses(): Promise<
  ProsecutionStatusRow[]
> {
  return db.select().from(prosecutionStatuses);
}

export async function insertProsecutionStatus({
  id,
  name,
}: {
  id: string;
  name: string;
}): Promise<ProsecutionStatusRow> {
  const [result] = await db
    .insert(prosecutionStatuses)
    .values({ id, name })
    .returning();
  return result;
}

export async function getProsecutionStatusById(
  id: string,
): Promise<ProsecutionStatusRow | undefined> {
  const [result] = await db
    .select()
    .from(prosecutionStatuses)
    .where(eq(prosecutionStatuses.id, id));
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
