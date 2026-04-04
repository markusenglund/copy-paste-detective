import { eq } from "drizzle-orm";
import { db } from "../../db";
import { DataFileType, DownloadStatus } from "../../db/shared/enums";
import { pmcDataFiles } from "./schema";

export type PmcDataFileRow = typeof pmcDataFiles.$inferSelect;

export async function upsertPmcDataFile(data: {
  pmcDatasetId: number;
  filename: string;
  fileType: DataFileType;
  s3Url: string;
  size: number;
}): Promise<PmcDataFileRow> {
  const [result] = await db
    .insert(pmcDataFiles)
    .values({
      ...data,
      downloadStatus: "not_started",
    })
    .onConflictDoUpdate({
      target: pmcDataFiles.s3Url,
      set: {
        pmcDatasetId: data.pmcDatasetId,
        filename: data.filename,
        fileType: data.fileType,
        size: data.size,
      },
    })
    .returning();
  return result;
}

export async function getPmcDataFilesByDatasetId(
  datasetId: number,
): Promise<PmcDataFileRow[]> {
  return db
    .select()
    .from(pmcDataFiles)
    .where(eq(pmcDataFiles.pmcDatasetId, datasetId));
}

export async function updatePmcDataFileDownloadStatus(
  fileId: number,
  status: DownloadStatus,
): Promise<void> {
  await db
    .update(pmcDataFiles)
    .set({ downloadStatus: status })
    .where(eq(pmcDataFiles.id, fileId));
}
