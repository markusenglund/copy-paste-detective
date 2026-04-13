import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { authors, AuthorInsert, Author } from "./schema";
import { processInBatches } from "../../utils/batch";

const BATCH_SIZE = 500;

export async function bulkUpsertAuthors(
  data: AuthorInsert[],
): Promise<Author[]> {
  if (data.length === 0) return [];

  const inputExtIds = data.map((a) => a.extOpenalexId).filter(Boolean) as string[];
  const existingRows =
    inputExtIds.length > 0
      ? await db
          .select()
          .from(authors)
          .where(inArray(authors.extOpenalexId, inputExtIds))
      : [];
  const existingByExtId = new Map(existingRows.map((r) => [r.extOpenalexId, r]));

  // We use a two-pass upsert strategy to handle duplicate constraints on both `orcid` and `extOpenalexId`.
  //
  // Pass 1 (safeRows): These rows either don't conflict, or if they conflict on `extOpenalexId`,
  // they also have the same `orcid` as what's already in the database. Thus, it's safe to use `orcid`
  // as the conflict target for upsert.
  //
  // Pass 2 (extIdConflicts): These are rows where the `extOpenalexId` we are trying to insert
  // already exists in the database, BUT under a different `orcid`. If we tried to upsert these
  // using `orcid` as the conflict target (as we do in Pass 1), PostgreSQL wouldn't hit a conflict
  // on `orcid` (since the `orcid` is different), and would instead attempt a fresh insert.
  // This would trigger a fatal duplicate key violation error on the `extOpenalexId` unique constraint.
  // Therefore, we must upsert these rows specifically using `extOpenalexId` as the conflict target.
  const extIdConflicts = data.filter(
    (a) =>
      a.extOpenalexId &&
      existingByExtId.has(a.extOpenalexId) &&
      existingByExtId.get(a.extOpenalexId)!.orcid !== a.orcid,
  );
  const safeRows = data.filter((a) => !extIdConflicts.includes(a));

  const pass1 = await processInBatches(safeRows, BATCH_SIZE, (batch) =>
    db
      .insert(authors)
      .values(batch)
      .onConflictDoUpdate({
        target: authors.orcid,
        set: {
          displayName: authors.displayName,
          extOpenalexId: authors.extOpenalexId,
          updatedTimestamp: new Date(),
        },
      })
      .returning(),
  );

  const pass2 = await processInBatches(extIdConflicts, BATCH_SIZE, (batch) =>
    db
      .insert(authors)
      .values(batch)
      .onConflictDoUpdate({
        target: authors.extOpenalexId,
        set: {
          orcid: authors.orcid,
          displayName: authors.displayName,
          updatedTimestamp: new Date(),
        },
      })
      .returning(),
  );

  return [...pass1, ...pass2];
}
