import { db } from "../../db";
import { authors, AuthorInsert, Author } from "./schema";

export async function bulkUpsertAuthors(
  data: AuthorInsert[],
): Promise<Author[]> {
  if (data.length === 0) return [];

  return db
    .insert(authors)
    .values(data)
    .onConflictDoUpdate({
      target: authors.orcid,
      set: {
        displayName: authors.displayName,
        extOpenalexId: authors.extOpenalexId,
        updatedTimestamp: new Date(),
      },
    })
    .returning();
}
