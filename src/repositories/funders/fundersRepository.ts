import { db } from "../../db";
import { funders, FunderInsert, Funder } from "./schema";
import { processInBatches } from "../../utils/batch";

const BATCH_SIZE = 500;

export async function bulkUpsertFunders(
  data: FunderInsert[],
): Promise<Funder[]> {
  if (data.length === 0) return [];

  return processInBatches(data, BATCH_SIZE, (batch) =>
    db
      .insert(funders)
      .values(batch)
      .onConflictDoUpdate({
        target: funders.rorId,
        set: {
          displayName: funders.displayName,
          openalexExtId: funders.openalexExtId,
        },
      })
      .returning(),
  );
}
