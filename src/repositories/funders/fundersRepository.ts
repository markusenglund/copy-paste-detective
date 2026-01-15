import { db } from "../../db";
import { funders, FunderInsert, Funder } from "./schema";

export async function bulkUpsertFunders(
  data: FunderInsert[],
): Promise<Funder[]> {
  if (data.length === 0) return [];

  return db
    .insert(funders)
    .values(data)
    .onConflictDoUpdate({
      target: funders.rorId,
      set: {
        displayName: funders.displayName,
        openalexExtId: funders.openalexExtId,
      },
    })
    .returning();
}
