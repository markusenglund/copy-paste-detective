import { eq } from "drizzle-orm";
import { db } from "../../db";
import { DownloadStatus } from "../../db/shared/enums";
import { dryadReadmeFiles } from "./schema";

// Re-export types for convenience
export type DryadReadmeFileRow = typeof dryadReadmeFiles.$inferSelect;

// ============ Readme Files ============

export async function insertReadmeFile(data: {
  dryadDatasetId: number;
  extFileId: number;
  filename: string;
  size: number;
  downloadStatus?: DownloadStatus;
}): Promise<DryadReadmeFileRow> {
  const [inserted] = await db
    .insert(dryadReadmeFiles)
    .values({
      ...data,
      downloadStatus: data.downloadStatus ?? "not_started",
    })
    .returning();
  return inserted;
}

export async function updateReadmeFileDownloadStatus(
  fileId: number,
  status: DownloadStatus,
): Promise<void> {
  await db
    .update(dryadReadmeFiles)
    .set({ downloadStatus: status })
    .where(eq(dryadReadmeFiles.id, fileId));
}

