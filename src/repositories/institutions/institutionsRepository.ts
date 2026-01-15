import { db } from "../../db";
import { institutions, InstitutionInsert, Institution } from "./schema";

export async function bulkUpsertInstitutions(
  data: InstitutionInsert[],
): Promise<Institution[]> {
  if (data.length === 0) return [];

  return db
    .insert(institutions)
    .values(data)
    .onConflictDoUpdate({
      target: institutions.rorId,
      set: {
        displayName: institutions.displayName,
        openalexExtId: institutions.openalexExtId,
        countryCode: institutions.countryCode,
        updatedTimestamp: new Date(),
      },
    })
    .returning();
}
