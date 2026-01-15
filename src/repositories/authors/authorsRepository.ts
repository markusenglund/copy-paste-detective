import { db } from "../../db";
import { authors, AuthorInsert, Author } from "./schema";
import { processInBatches } from "../../utils/batch";

const BATCH_SIZE = 500;

export async function bulkUpsertAuthors(
  data: AuthorInsert[],
): Promise<Author[]> {
  if (data.length === 0) return [];

  return processInBatches(data, BATCH_SIZE, (batch) =>
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
}
