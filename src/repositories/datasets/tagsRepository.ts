import { eq, and, inArray } from "drizzle-orm";
import { db } from "../../db";
import { tags, datasetTags } from "./tagsSchema";

export type TagRow = typeof tags.$inferSelect;

export async function getAllTags(): Promise<TagRow[]> {
  return db.select().from(tags);
}

export async function getTagsForDataset(datasetId: number): Promise<TagRow[]> {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(datasetTags)
    .innerJoin(tags, eq(tags.id, datasetTags.tagId))
    .where(eq(datasetTags.datasetId, datasetId));
}

export async function addTagToDataset(
  datasetId: number,
  tagId: string,
): Promise<void> {
  await db
    .insert(datasetTags)
    .values({ datasetId, tagId })
    .onConflictDoNothing();
}

export async function removeTagFromDataset(
  datasetId: number,
  tagId: string,
): Promise<void> {
  await db
    .delete(datasetTags)
    .where(
      and(eq(datasetTags.datasetId, datasetId), eq(datasetTags.tagId, tagId)),
    );
}

export async function getTagsForDatasetIds(
  datasetIds: number[],
): Promise<Map<number, TagRow[]>> {
  if (datasetIds.length === 0) return new Map();

  const rows = await db
    .select({
      datasetId: datasetTags.datasetId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(datasetTags)
    .innerJoin(tags, eq(tags.id, datasetTags.tagId))
    .where(inArray(datasetTags.datasetId, datasetIds));

  const map = new Map<number, TagRow[]>();
  for (const row of rows) {
    const existing = map.get(row.datasetId) ?? [];
    existing.push({ id: row.id, name: row.name, color: row.color });
    map.set(row.datasetId, existing);
  }
  return map;
}
