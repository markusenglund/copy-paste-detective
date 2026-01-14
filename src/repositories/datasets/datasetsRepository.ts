import { and, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { AnalysisStatus, DownloadStatus } from "../../db/shared/enums";
import { dryadDatasets } from "./schema";
import { dryadExcelFiles } from "../excelFiles/schema";
import { dryadReadmeFiles } from "../readmeFiles/schema";
import type { DryadExcelFileRow } from "../excelFiles/excelFilesRepository";
import type { DryadReadmeFileRow } from "../readmeFiles/readmeFilesRepository";
import { logger } from "../../utils/logger";

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
  limit: number,
): Promise<DryadDatasetWithFiles[]> {
  const datasets = await db
    .select()
    .from(dryadDatasets)
    .where(eq(dryadDatasets.downloadStatus, status))
    .limit(limit);

  if (datasets.length === 0) return [];

  const datasetIds = datasets.map((d) => d.id);

  // Single query for all excel files
  const allExcelFiles = await db
    .select()
    .from(dryadExcelFiles)
    .where(inArray(dryadExcelFiles.dryadDatasetId, datasetIds));

  // Single query for all readme files
  const allReadmeFiles = await db
    .select()
    .from(dryadReadmeFiles)
    .where(inArray(dryadReadmeFiles.dryadDatasetId, datasetIds));

  // Group files by dataset ID in JS
  const excelFilesByDatasetId = Map.groupBy(
    allExcelFiles,
    (f) => f.dryadDatasetId,
  );
  const readmeFilesByDatasetId = Map.groupBy(
    allReadmeFiles,
    (f) => f.dryadDatasetId,
  );

  return datasets.map((dataset) => ({
    ...dataset,
    excelFiles: excelFilesByDatasetId.get(dataset.id) ?? [],
    readmeFile: readmeFilesByDatasetId.get(dataset.id)?.[0] ?? null,
  }));
}

/**
 * Get datasets ready for download with filters applied in SQL:
 * - downloadStatus = 'not_started'
 * - has usageNotes OR has a readme file
 * - has <= 3 excel files
 * - ordered by publication date (newest first)
 */
export async function getDatasetsForDownload(
  limit: number,
): Promise<DryadDatasetWithFiles[]> {
  // Subquery: check if readme file exists
  const hasReadmeFile = sql<boolean>`EXISTS (
    SELECT 1 FROM dryad_readme_files 
    WHERE dryad_readme_files.dryad_dataset_id = dryad_datasets.id
  )`;

  // Subquery: count excel files <= 3
  const excelFileCount = sql<number>`(
    SELECT COUNT(*) FROM dryad_excel_files 
    WHERE dryad_excel_files.dryad_dataset_id = dryad_datasets.id
  )`;
  logger.info("Before query");
  const datasets = await db
    .select()
    .from(dryadDatasets)
    .where(
      and(
        eq(dryadDatasets.downloadStatus, "not_started"),
        or(isNotNull(dryadDatasets.usageNotes), hasReadmeFile),
        sql`${excelFileCount} <= 3`,
      ),
    )
    .orderBy(desc(dryadDatasets.dryadPublicationDate))
    .limit(limit);

  logger.info(`Datasets: ${datasets.length}`);
  if (datasets.length === 0) return [];

  const datasetIds = datasets.map((d) => d.id);

  // Batch fetch excel files
  const allExcelFiles = await db
    .select()
    .from(dryadExcelFiles)
    .where(inArray(dryadExcelFiles.dryadDatasetId, datasetIds));

  // Batch fetch readme files
  const allReadmeFiles = await db
    .select()
    .from(dryadReadmeFiles)
    .where(inArray(dryadReadmeFiles.dryadDatasetId, datasetIds));

  // Group files by dataset ID
  const excelFilesByDatasetId = Map.groupBy(
    allExcelFiles,
    (f) => f.dryadDatasetId,
  );
  const readmeFilesByDatasetId = Map.groupBy(
    allReadmeFiles,
    (f) => f.dryadDatasetId,
  );

  return datasets.map((dataset) => ({
    ...dataset,
    excelFiles: excelFilesByDatasetId.get(dataset.id) ?? [],
    readmeFile: readmeFilesByDatasetId.get(dataset.id)?.[0] ?? null,
  }));
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
  const [inserted] = await db
    .insert(dryadDatasets)
    .values({
      ...data,
      downloadStatus: data.downloadStatus ?? "not_started",
    })
    .returning();
  return inserted;
}

export async function upsertDataset(data: {
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
}): Promise<{ dataset: DryadDatasetRow; isNew: boolean }> {
  const [result] = await db
    .insert(dryadDatasets)
    .values({
      ...data,
      downloadStatus: "not_started",
    })
    .onConflictDoUpdate({
      target: dryadDatasets.extId,
      set: {
        datasetDoi: data.datasetDoi,
        originalFileSize: data.originalFileSize,
        title: data.title,
        abstract: data.abstract,
        usageNotes: data.usageNotes,
        primaryArticleUrl: data.primaryArticleUrl,
        journalIssn: data.journalIssn,
        dryadPublicationDate: data.dryadPublicationDate,
        dryadLastModifiedDate: data.dryadLastModifiedDate,
        latestVersionId: data.latestVersionId,
        updatedTimestamp: new Date(),
        // Preserve: downloadStatus, analysisStatus, indexedTimestamp
      },
    })
    .returning();

  const isNew =
    result.indexedTimestamp.getTime() === result.updatedTimestamp.getTime();
  return { dataset: result, isNew };
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

// ============ Analysis Status ============

export async function getDatasetsByAnalysisStatus(
  status: AnalysisStatus,
): Promise<DryadDatasetRow[]> {
  return db
    .select()
    .from(dryadDatasets)
    .where(eq(dryadDatasets.analysisStatus, status));
}

export async function getDatasetsByAnalysisStatusWithFiles(
  analysisStatus: AnalysisStatus,
): Promise<DryadDatasetWithFiles[]> {
  const datasets = await getDatasetsByAnalysisStatus(analysisStatus);
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

export async function getDownloadedNotAnalyzedDatasetsWithFiles(): Promise<
  DryadDatasetWithFiles[]
> {
  const datasets = await db
    .select()
    .from(dryadDatasets)
    .where(
      and(
        eq(dryadDatasets.downloadStatus, "completed"),
        inArray(dryadDatasets.analysisStatus, ["not_analyzed", "failed"]),
      ),
    );

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

export async function updateDatasetAnalysisStatus(
  extId: number,
  status: AnalysisStatus,
): Promise<void> {
  await db
    .update(dryadDatasets)
    .set({ analysisStatus: status, updatedTimestamp: new Date() })
    .where(eq(dryadDatasets.extId, extId));
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
    skipped: 0,
    api_forbidden: 0,
    api_not_found: 0,
  };

  for (const row of result) {
    counts[row.status] = row.count;
  }

  return counts;
}
