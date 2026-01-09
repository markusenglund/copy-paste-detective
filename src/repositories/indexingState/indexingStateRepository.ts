import { eq } from "drizzle-orm";
import { db } from "../../db";
import { dryadIndexingState } from "./schema";

// ============ Indexing State ============

export async function getLastPageIndexed(): Promise<number | null> {
  const result = await db.select().from(dryadIndexingState).limit(1);
  return result[0]?.lastPageIndexed ?? null;
}

export async function setLastPageIndexed(page: number): Promise<void> {
  const existing = await db.select().from(dryadIndexingState).limit(1);
  if (existing.length === 0) {
    await db.insert(dryadIndexingState).values({ lastPageIndexed: page });
  } else {
    await db
      .update(dryadIndexingState)
      .set({ lastPageIndexed: page })
      .where(eq(dryadIndexingState.id, existing[0].id));
  }
}
