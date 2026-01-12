import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { DownloadStatus } from "../../db/shared/enums";
import { dryadExcelFiles } from "./schema";

// Re-export types for convenience
export type DryadExcelFileRow = typeof dryadExcelFiles.$inferSelect;

// ============ Excel Files ============

export async function insertExcelFile(data: {
  dryadDatasetId: number;
  extFileId: number;
  filename: string;
  size: number;
  downloadStatus?: DownloadStatus;
}): Promise<DryadExcelFileRow> {
  const [inserted] = await db
    .insert(dryadExcelFiles)
    .values({
      ...data,
      downloadStatus: data.downloadStatus ?? "not_started",
    })
    .returning();
  return inserted;
}

export async function insertExcelFiles(
  files: {
    dryadDatasetId: number;
    extFileId: number;
    filename: string;
    size: number;
    downloadStatus?: DownloadStatus;
  }[],
): Promise<DryadExcelFileRow[]> {
  if (files.length === 0) return [];
  return db
    .insert(dryadExcelFiles)
    .values(
      files.map((f) => ({
        ...f,
        downloadStatus: f.downloadStatus ?? "not_started",
      })),
    )
    .returning();
}

export async function upsertExcelFile(data: {
  dryadDatasetId: number;
  extFileId: number;
  filename: string;
  size: number;
}): Promise<DryadExcelFileRow> {
  const [result] = await db
    .insert(dryadExcelFiles)
    .values({
      ...data,
      downloadStatus: "not_started",
    })
    .onConflictDoUpdate({
      target: dryadExcelFiles.extFileId,
      set: {
        dryadDatasetId: data.dryadDatasetId,
        filename: data.filename,
        size: data.size,
        // Preserve: downloadStatus
      },
    })
    .returning();
  return result;
}

export async function updateExcelFileDownloadStatus(
  fileId: number,
  status: DownloadStatus,
): Promise<void> {
  await db
    .update(dryadExcelFiles)
    .set({ downloadStatus: status })
    .where(eq(dryadExcelFiles.id, fileId));
}

export async function getExcelFilesByDatasetId(
  datasetId: number,
): Promise<DryadExcelFileRow[]> {
  return db
    .select()
    .from(dryadExcelFiles)
    .where(eq(dryadExcelFiles.dryadDatasetId, datasetId));
}

// ============ Stats ============

export async function getTotalExcelFileCount(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dryadExcelFiles);
  return result[0]?.count ?? 0;
}

export async function getTotalExcelFileSize(): Promise<number> {
  const result = await db
    .select({ sum: sql<number>`coalesce(sum(size), 0)::bigint` })
    .from(dryadExcelFiles);
  return Number(result[0]?.sum ?? 0);
}
