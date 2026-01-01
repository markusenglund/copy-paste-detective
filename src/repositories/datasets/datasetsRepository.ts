import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { DownloadStatus } from "../../db/shared/enums";
import { dryadDatasets } from "./schema";
import { dryadExcelFiles } from "../excelFiles/schema";
import { dryadReadmeFiles } from "../readmeFiles/schema";
import type { DryadExcelFileRow } from "../excelFiles/excelFilesRepository";
import type { DryadReadmeFileRow } from "../readmeFiles/readmeFilesRepository";

// Re-export types for convenience
export type DryadDatasetRow = typeof dryadDatasets.$inferSelect;

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

