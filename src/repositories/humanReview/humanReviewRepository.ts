import { eq, sql, desc } from "drizzle-orm";
import { db } from "../../db";
import { humanReviews, prosecutionStatuses } from "./schema";
import { users } from "../users/schema";

export type HumanReviewRow = typeof humanReviews.$inferSelect;
export type ProsecutionStatusRow = typeof prosecutionStatuses.$inferSelect;

export async function upsertHumanReview(data: {
  dryadDatasetId: number;
  userId: number;
  verdict: "true_positive" | "false_positive" | "ambiguous";
  impactScore: number;
  notes: string | null;
  prosecutionStatusId: string;
}): Promise<HumanReviewRow> {
  return db.transaction(async (tx) => {
    await tx
      .update(humanReviews)
      .set({ isLatestReview: false })
      .where(eq(humanReviews.dryadDatasetId, data.dryadDatasetId));

    const [result] = await tx
      .insert(humanReviews)
      .values({
        dryadDatasetId: data.dryadDatasetId,
        userId: data.userId,
        isLatestReview: true,
        verdict: data.verdict,
        impactScore: data.impactScore,
        notes: data.notes,
        prosecutionStatusId: data.prosecutionStatusId,
      })
      .onConflictDoUpdate({
        target: [humanReviews.dryadDatasetId, humanReviews.userId],
        set: {
          verdict: data.verdict,
          impactScore: data.impactScore,
          notes: data.notes,
          prosecutionStatusId: data.prosecutionStatusId,
          isLatestReview: true,
          updatedAt: sql`NOW()`,
        },
      })
      .returning();

    return result;
  });
}

export interface HumanReviewWithUser {
  id: number;
  verdict: "true_positive" | "false_positive" | "ambiguous";
  impactScore: number;
  notes: string | null;
  isLatestReview: boolean;
  prosecutionStatusId: string;
  caseName: string | null;
  reviewerUsername: string;
  updatedAt: Date;
}

export async function getReviewsForDataset(
  dryadDatasetId: number,
): Promise<HumanReviewWithUser[]> {
  return db
    .select({
      id: humanReviews.id,
      verdict: humanReviews.verdict,
      impactScore: humanReviews.impactScore,
      notes: humanReviews.notes,
      isLatestReview: humanReviews.isLatestReview,
      prosecutionStatusId: humanReviews.prosecutionStatusId,
      caseName: prosecutionStatuses.name,
      reviewerUsername: users.username,
      updatedAt: humanReviews.updatedAt,
    })
    .from(humanReviews)
    .innerJoin(users, eq(users.id, humanReviews.userId))
    .leftJoin(
      prosecutionStatuses,
      eq(prosecutionStatuses.id, humanReviews.prosecutionStatusId),
    )
    .where(eq(humanReviews.dryadDatasetId, dryadDatasetId))
    .orderBy(desc(humanReviews.updatedAt));
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
