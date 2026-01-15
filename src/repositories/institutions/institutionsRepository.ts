import { db } from "../../db";
import { institutions, InstitutionInsert, Institution } from "./schema";
import { processInBatches } from "../../utils/batch";

const BATCH_SIZE = 500;

export async function bulkUpsertInstitutions(
  data: InstitutionInsert[],
): Promise<Institution[]> {
  if (data.length === 0) return [];

  return processInBatches(data, BATCH_SIZE, (batch) =>
    db
      .insert(institutions)
      .values(batch)
      .onConflictDoUpdate({
        target: institutions.rorId,
        set: {
          displayName: institutions.displayName,
          openalexExtId: institutions.openalexExtId,
          countryCode: institutions.countryCode,
          updatedTimestamp: new Date(),
        },
      })
      .returning(),
  );
}
