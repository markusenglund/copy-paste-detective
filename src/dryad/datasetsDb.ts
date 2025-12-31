import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "../db";
import {
  dryadDatasets,
  dryadExcelFiles,
  dryadReadmeFiles,
  dryadIndexingState,
  downloadStatusEnum,
} from "../db/schema";

// Re-export types for convenience
export type DryadDatasetRow = typeof dryadDatasets.$inferSelect;
export type DryadExcelFileRow = typeof dryadExcelFiles.$inferSelect;
export type DryadReadmeFileRow = typeof dryadReadmeFiles.$inferSelect;
export type DownloadStatus = (typeof downloadStatusEnum.enumValues)[number];

// Composite type that includes related files
export type DryadDatasetWithFiles = DryadDatasetRow & {
  excelFiles: DryadExcelFileRow[];
  readmeFile: DryadReadmeFileRow | null;
};

// ============ Datasets ============

export async function getAllDatasets(): Promise<DryadDatasetRow[]> {
  return db.select().from(dryadDatasets);
}

export async function getDatasetsByDownloadStatus(
  status: DownloadStatus,
): Promise<DryadDatasetRow[]> {
  return db
    .select()
    .from(dryadDatasets)
    .where(eq(dryadDatasets.downloadStatus, status));
}

export async function getDatasetByExtId(
  extId: number,
): Promise<DryadDatasetRow | undefined> {
  const result = await db
    .select()
    .from(dryadDatasets)
    .where(eq(dryadDatasets.extId, extId))
    .limit(1);
  return result[0];
}

export async function getDatasetWithFiles(
  extId: number,
): Promise<DryadDatasetWithFiles | undefined> {
  const dataset = await getDatasetByExtId(extId);
  if (!dataset) return undefined;

  const excelFiles = await db
    .select()
    .from(dryadExcelFiles)
    .where(eq(dryadExcelFiles.dryadDatasetId, dataset.id));

  const readmeFiles = await db
    .select()
    .from(dryadReadmeFiles)
    .where(eq(dryadReadmeFiles.dryadDatasetId, dataset.id))
    .limit(1);

  return {
    ...dataset,
    excelFiles,
    readmeFile: readmeFiles[0] ?? null,
  };
}

export async function getAllDatasetsWithFiles(): Promise<
  DryadDatasetWithFiles[]
> {
  const datasets = await getAllDatasets();
  const result: DryadDatasetWithFiles[] = [];

  for (const dataset of datasets) {
    const excelFiles = await db
      .select()
      .from(dryadExcelFiles)
      .where(eq(dryadExcelFiles.dryadDatasetId, dataset.id));

    const readmeFiles = await db
      .select()
      .from(dryadReadmeFiles)
      .where(eq(dryadReadmeFiles.dryadDatasetId, dataset.id))
      .limit(1);

    result.push({
      ...dataset,
      excelFiles,
      readmeFile: readmeFiles[0] ?? null,
    });
  }

  return result;
}

export async function getDatasetsByDownloadStatusWithFiles(
  status: DownloadStatus,
): Promise<DryadDatasetWithFiles[]> {
  const datasets = await getDatasetsByDownloadStatus(status);
  const result: DryadDatasetWithFiles[] = [];

  for (const dataset of datasets) {
    const excelFiles = await db
      .select()
      .from(dryadExcelFiles)
      .where(eq(dryadExcelFiles.dryadDatasetId, dataset.id));

    const readmeFiles = await db
      .select()
      .from(dryadReadmeFiles)
      .where(eq(dryadReadmeFiles.dryadDatasetId, dataset.id))
      .limit(1);

    result.push({
      ...dataset,
      excelFiles,
      readmeFile: readmeFiles[0] ?? null,
    });
  }

  return result;
}

export async function getAllExtIds(): Promise<Set<number>> {
  const result = await db
    .select({ extId: dryadDatasets.extId })
    .from(dryadDatasets);
  return new Set(result.map((r) => r.extId));
}

export async function insertDataset(data: {
  extId: number;
  datasetDoi: string;
  originalFileSize?: number | null;
  title: string;
  abstract?: string | null;
  usageNotes?: string | null;
  primaryArticleUrl?: string | null;
  journalIssn?: string | null;
  dryadPublicationDate: string;
  dryadLastModifiedDate: string;
  latestVersionId: number;
  downloadStatus?: DownloadStatus;
}): Promise<DryadDatasetRow> {
  const now = new Date();
  const [inserted] = await db
    .insert(dryadDatasets)
    .values({
      ...data,
      downloadStatus: data.downloadStatus ?? "not_started",
      indexedTimestamp: now,
      updatedTimestamp: now,
    })
    .returning();
  return inserted;
}

export async function updateDatasetDownloadStatus(
  extId: number,
  status: DownloadStatus,
): Promise<void> {
  await db
    .update(dryadDatasets)
    .set({ downloadStatus: status, updatedTimestamp: new Date() })
    .where(eq(dryadDatasets.extId, extId));
}

export async function updateDatasetDownloadStatusByCurrentStatus(
  currentStatus: DownloadStatus,
  newStatus: DownloadStatus,
): Promise<number> {
  const result = await db
    .update(dryadDatasets)
    .set({ downloadStatus: newStatus, updatedTimestamp: new Date() })
    .where(eq(dryadDatasets.downloadStatus, currentStatus));
  return result.rowCount ?? 0;
}

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

// ============ Indexing State ============

export async function getLastPageIndexed(): Promise<number | null> {
  const result = await db.select().from(dryadIndexingState).limit(1);
  return result[0]?.lastPageIndexed ?? null;
}

export async function setLastPageIndexed(page: number): Promise<void> {
  const existing = await db.select().from(dryadIndexingState).limit(1);
  if (existing.length === 0) {
    await db.insert(dryadIndexingState).values({ lastPageIndexed: page });
  } else {
    await db
      .update(dryadIndexingState)
      .set({ lastPageIndexed: page })
      .where(eq(dryadIndexingState.id, existing[0].id));
  }
}

// ============ Stats ============

export async function getDatasetCountByStatus(): Promise<
  Record<DownloadStatus, number>
> {
  const result = await db
    .select({
      status: dryadDatasets.downloadStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(dryadDatasets)
    .groupBy(dryadDatasets.downloadStatus);

  const counts: Record<DownloadStatus, number> = {
    not_started: 0,
    in_progress: 0,
    failed: 0,
    completed: 0,
  };

  for (const row of result) {
    counts[row.status] = row.count;
  }

  return counts;
}

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
