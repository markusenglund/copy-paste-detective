import { eq } from "drizzle-orm";
import { db } from "../../db";
import { pmcIndexingState } from "./schema";

export async function getLastCursorMark(): Promise<{
  cursorMark: string | null;
  totalIndexed: number;
}> {
  const result = await db.select().from(pmcIndexingState).limit(1);
  return {
    cursorMark: result[0]?.lastCursorMark ?? null,
    totalIndexed: result[0]?.totalIndexed ?? 0,
  };
}

export async function setLastCursorMark(
  cursorMark: string,
  totalIndexed: number,
): Promise<void> {
  const existing = await db.select().from(pmcIndexingState).limit(1);
  if (existing.length === 0) {
    await db
      .insert(pmcIndexingState)
      .values({ lastCursorMark: cursorMark, totalIndexed });
  } else {
    await db
      .update(pmcIndexingState)
      .set({ lastCursorMark: cursorMark, totalIndexed })
      .where(eq(pmcIndexingState.id, existing[0].id));
  }
}
