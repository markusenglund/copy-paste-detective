import { eq, sql, desc } from "drizzle-orm";
import { db } from "../../db";
import { humanReviews } from "./schema";
import { users } from "../users/schema";

export type HumanReviewRow = typeof humanReviews.$inferSelect;

export async function upsertHumanReview(data: {
  datasetId: number;
  userId: number;
  verdict: "true_positive" | "false_positive" | "ambiguous";
  impactScore: number;
  notes: string | null;
}): Promise<HumanReviewRow> {
  return db.transaction(async (tx) => {
    await tx
      .update(humanReviews)
      .set({ isLatestReview: false })
      .where(eq(humanReviews.dryadDatasetId, data.datasetId));

    const [result] = await tx
      .insert(humanReviews)
      .values({
        dryadDatasetId: data.datasetId,
        userId: data.userId,
        isLatestReview: true,
        verdict: data.verdict,
        impactScore: data.impactScore,
        notes: data.notes,
      })
      .onConflictDoUpdate({
        target: [humanReviews.dryadDatasetId, humanReviews.userId],
        set: {
          verdict: data.verdict,
          impactScore: data.impactScore,
          notes: data.notes,
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
  reviewerUsername: string;
  updatedAt: Date;
}

export async function getReviewsForDataset(
  datasetId: number,
): Promise<HumanReviewWithUser[]> {
  return db
    .select({
      id: humanReviews.id,
      verdict: humanReviews.verdict,
      impactScore: humanReviews.impactScore,
      notes: humanReviews.notes,
      isLatestReview: humanReviews.isLatestReview,
      reviewerUsername: users.username,
      updatedAt: humanReviews.updatedAt,
    })
    .from(humanReviews)
    .innerJoin(users, eq(users.id, humanReviews.userId))
    .where(eq(humanReviews.dryadDatasetId, datasetId))
    .orderBy(desc(humanReviews.updatedAt));
}
