import {
  and,
  eq,
  inArray,
  or,
  isNull,
  isNotNull,
  exists,
  sql,
  desc,
  lt,
} from "drizzle-orm";
import { db } from "../../db";
import {
  AnalysisStatus,
  DatasetSource,
  DownloadStatus,
  DataFileType,
} from "../../db/shared/enums";
import { datasets } from "./unifiedSchema";
import { datasetFiles } from "../datasetFiles/schema";
import { pmcDatasetDetails } from "./pmcDetailsSchema";
import { pmcDatasetFileDetails } from "../datasetFiles/pmcDetailsSchema";
import { dryadDatasetDetails } from "./dryadDetailsSchema";
import { dryadDatasetFileDetails } from "../datasetFiles/dryadDetailsSchema";
import { articles } from "../articles/schema";
import { journals } from "../journals/schema";
import { logger } from "../../utils/logger";

export type DatasetRow = typeof datasets.$inferSelect;
export type DatasetFileRow = typeof datasetFiles.$inferSelect;
export type DatasetFileWithCaption = DatasetFileRow & {
  caption?: string | null;
};

export type DatasetWithFiles = DatasetRow & {
  dataFiles: DatasetFileWithCaption[];
  pmcDetails?: typeof pmcDatasetDetails.$inferSelect | null;
};

async function mergeCaptions(
  files: DatasetFileRow[],
): Promise<DatasetFileWithCaption[]> {
  if (files.length === 0) return [];
  const fileIds = files.map((f) => f.id);
  const captionRows = await db
    .select({
      datasetFileId: pmcDatasetFileDetails.datasetFileId,
      caption: pmcDatasetFileDetails.caption,
    })
    .from(pmcDatasetFileDetails)
    .where(inArray(pmcDatasetFileDetails.datasetFileId, fileIds));
  const captionByFileId = new Map(
    captionRows.map((r) => [r.datasetFileId, r.caption]),
  );
  return files.map((f) => ({ ...f, caption: captionByFileId.get(f.id) }));
}

export async function getDownloadedNotAnalyzedPmcDatasetsWithFiles(): Promise<
  DatasetWithFiles[]
> {
  const matchedDatasets = await db
    .select({
      dataset: datasets,
      pmcDetails: pmcDatasetDetails,
    })
    .from(datasets)
    .leftJoin(pmcDatasetDetails, eq(pmcDatasetDetails.datasetId, datasets.id))
    .where(
      and(
        eq(datasets.source, "pmc"),
        eq(datasets.downloadStatus, "completed"),
        inArray(datasets.analysisStatus, ["not_analyzed", "failed"]),
        or(isNull(datasets.isMetaAnalysis), eq(datasets.isMetaAnalysis, false)),
      ),
    );

  if (matchedDatasets.length === 0) return [];
  const datasetIds = matchedDatasets.map((d) => d.dataset.id);

  const allDataFiles = await db
    .select()
    .from(datasetFiles)
    .where(
      and(
        inArray(datasetFiles.datasetId, datasetIds),
        eq(datasetFiles.fileType, "excel"),
      ),
    );

  const allDataFilesWithCaptions = await mergeCaptions(allDataFiles);
  const dataFilesByDatasetId = Map.groupBy(
    allDataFilesWithCaptions,
    (f) => f.datasetId,
  );

  return matchedDatasets.map((d) => ({
    ...d.dataset,
    pmcDetails: d.pmcDetails,
    dataFiles: dataFilesByDatasetId.get(d.dataset.id) || [],
  }));
}

export async function getPmcDatasetByExtId(
  extPmcId: string,
): Promise<DatasetWithFiles | undefined> {
  const [match] = await db
    .select({
      dataset: datasets,
      pmcDetails: pmcDatasetDetails,
    })
    .from(datasets)
    .leftJoin(pmcDatasetDetails, eq(pmcDatasetDetails.datasetId, datasets.id))
    .where(and(eq(datasets.source, "pmc"), eq(datasets.extId, extPmcId)));

  if (!match) return undefined;

  const dataFilesRows = await db
    .select()
    .from(datasetFiles)
    .where(eq(datasetFiles.datasetId, match.dataset.id));

  const dataFilesWithCaptions = await mergeCaptions(dataFilesRows);

  return {
    ...match.dataset,
    pmcDetails: match.pmcDetails,
    dataFiles: dataFilesWithCaptions,
  };
}

export async function updateDatasetAnalysisStatus(
  datasetId: number,
  status: AnalysisStatus,
): Promise<void> {
  await db
    .update(datasets)
    .set({ analysisStatus: status, updatedTimestamp: new Date() })
    .where(eq(datasets.id, datasetId));
}

export async function updateDatasetIsMetaAnalysis(
  datasetId: number,
  isMetaAnalysis: boolean,
): Promise<void> {
  await db
    .update(datasets)
    .set({ isMetaAnalysis, updatedTimestamp: new Date() })
    .where(eq(datasets.id, datasetId));
}

export async function resetPmcAnalysisStatusesExceptFailed(): Promise<number> {
  const result = await db
    .update(datasets)
    .set({ analysisStatus: "not_analyzed", updatedTimestamp: new Date() })
    .where(
      and(
        eq(datasets.source, "pmc"),
        eq(datasets.downloadStatus, "completed"),
        inArray(datasets.analysisStatus, [
          "not_flagged_for_review",
          "flagged_for_review",
          "reviewed_by_ai",
          "pdf_reviewed_by_ai",
        ]),
      ),
    );
  return result.rowCount ?? 0;
}

export async function upsertPmcDataset(data: {
  extPmcId: string;
  pmcVersion: number;
  extPmid: string | null;
  doi: string | null;
  title: string;
  abstract: string | null;
  authorString: string | null;
  journalIssn: string | null;
  pmcPublicationDate: string;
  numCitations: number | null;
  license: string | null;
  isRetracted: boolean | null;
  fullPdfUrl: string | null;
  textUrl: string | null;
  xmlUrl: string | null;
  fullText: string | null;
  supplementalFileUrls: string[] | null;
  isMetaAnalysis: boolean | null;
}): Promise<{ dataset: DatasetRow; isNew: boolean }> {
  return await db.transaction(async (tx) => {
    const [dataset] = await tx
      .insert(datasets)
      .values({
        source: "pmc",
        extId: data.extPmcId,
        doi: data.doi,
        title: data.title,
        abstract: data.abstract,
        journalIssn: data.journalIssn,
        publicationDate: data.pmcPublicationDate,
        downloadStatus: "not_started",
        isMetaAnalysis: data.isMetaAnalysis,
      })
      .onConflictDoUpdate({
        target: [datasets.source, datasets.extId],
        set: {
          doi: data.doi,
          title: data.title,
          abstract: data.abstract,
          journalIssn: data.journalIssn,
          publicationDate: data.pmcPublicationDate,
          isMetaAnalysis: data.isMetaAnalysis,
          updatedTimestamp: new Date(),
        },
      })
      .returning();

    await tx
      .insert(pmcDatasetDetails)
      .values({
        datasetId: dataset.id,
        pmcVersion: data.pmcVersion,
        extPmid: data.extPmid,
        authorString: data.authorString,
        numCitations: data.numCitations,
        license: data.license,
        isRetracted: data.isRetracted,
        fullPdfUrl: data.fullPdfUrl,
        textUrl: data.textUrl,
        xmlUrl: data.xmlUrl,
        fullText: data.fullText,
        supplementalFileUrls: data.supplementalFileUrls,
      })
      .onConflictDoUpdate({
        target: pmcDatasetDetails.datasetId,
        set: {
          pmcVersion: data.pmcVersion,
          extPmid: data.extPmid,
          authorString: data.authorString,
          numCitations: data.numCitations,
          license: data.license,
          isRetracted: data.isRetracted,
          fullPdfUrl: data.fullPdfUrl,
          textUrl: data.textUrl,
          xmlUrl: data.xmlUrl,
          fullText: data.fullText,
          supplementalFileUrls: data.supplementalFileUrls,
        },
      });

    const isNew =
      dataset.indexedTimestamp.getTime() === dataset.updatedTimestamp.getTime();
    return { dataset, isNew };
  });
}

export async function upsertPmcDataFile(data: {
  pmcDatasetId: number;
  filename: string;
  fileType: DataFileType;
  s3Url: string;
  size: number;
  caption: string | null;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const existingDetail = await tx
      .select()
      .from(pmcDatasetFileDetails)
      .where(eq(pmcDatasetFileDetails.s3Url, data.s3Url))
      .limit(1);

    if (existingDetail.length > 0) {
      await tx
        .update(datasetFiles)
        .set({
          filename: data.filename,
          fileType: data.fileType,
          size: data.size,
        })
        .where(eq(datasetFiles.id, existingDetail[0].datasetFileId));
      await tx
        .update(pmcDatasetFileDetails)
        .set({ caption: data.caption })
        .where(
          eq(
            pmcDatasetFileDetails.datasetFileId,
            existingDetail[0].datasetFileId,
          ),
        );
    } else {
      const [newFile] = await tx
        .insert(datasetFiles)
        .values({
          datasetId: data.pmcDatasetId,
          source: "pmc",
          filename: data.filename,
          fileType: data.fileType,
          size: data.size,
          downloadStatus: "not_started",
        })
        .returning();

      await tx.insert(pmcDatasetFileDetails).values({
        datasetFileId: newFile.id,
        s3Url: data.s3Url,
        caption: data.caption,
      });
    }
  });
}

export async function getPmcDatasetsWithoutArticles(
  limit?: number,
): Promise<DatasetWithFiles[]> {
  const query = db
    .select({
      dataset: datasets,
      pmcDetails: pmcDatasetDetails,
    })
    .from(datasets)
    .leftJoin(pmcDatasetDetails, eq(pmcDatasetDetails.datasetId, datasets.id))
    .where(
      and(
        eq(datasets.source, "pmc"),
        isNull(datasets.articleId),
        exists(
          db
            .select()
            .from(datasetFiles)
            .where(eq(datasetFiles.datasetId, datasets.id)),
        ),
      ),
    );

  const matchedDatasets = limit ? await query.limit(limit) : await query;
  if (matchedDatasets.length === 0) return [];

  const datasetIds = matchedDatasets.map((d) => d.dataset.id);

  const allDataFiles = await db
    .select()
    .from(datasetFiles)
    .where(inArray(datasetFiles.datasetId, datasetIds));

  const dataFilesByDatasetId = Map.groupBy(allDataFiles, (f) => f.datasetId);

  return matchedDatasets.map((d) => ({
    ...d.dataset,
    pmcDetails: d.pmcDetails,
    dataFiles: dataFilesByDatasetId.get(d.dataset.id) || [],
  }));
}

export async function updateDatasetArticleId(
  datasetId: number,
  articleId: number,
): Promise<void> {
  await db
    .update(datasets)
    .set({ articleId, updatedTimestamp: new Date() })
    .where(eq(datasets.id, datasetId));
}

export async function getPmcDatasetsForDownload(
  limit: number,
): Promise<(DatasetWithFiles & { citationScore: number })[]> {
  const dataFileCount = sql<number>`(
    SELECT COUNT(*) FROM dataset_files
    WHERE dataset_files.dataset_id = datasets.id
  )`;

  const citationScoreExpr =
    sql<number>`COALESCE((COALESCE(${journals.sjrScore}, 0.0) + ${articles.numCitations}) * LOG(10.0 + COALESCE(${journals.sjrScore}, 0.0)) / (1.0 + COALESCE(CAST(CURRENT_DATE - ${articles.publicationDate} AS numeric) / 365.25, 10.0)), 0)`.as(
      "citationScore",
    );

  const matchedDatasets = await db
    .select({
      dataset: datasets,
      pmcDetails: pmcDatasetDetails,
      citationScore: citationScoreExpr,
    })
    .from(datasets)
    .leftJoin(pmcDatasetDetails, eq(pmcDatasetDetails.datasetId, datasets.id))
    .leftJoin(articles, eq(datasets.articleId, articles.id))
    .leftJoin(journals, eq(articles.journalId, journals.id))
    .where(
      and(
        eq(datasets.source, "pmc"),
        eq(datasets.downloadStatus, "not_started"),
        exists(
          db
            .select()
            .from(datasetFiles)
            .where(eq(datasetFiles.datasetId, datasets.id)),
        ),
        sql`${dataFileCount} <= 3`,
      ),
    )
    .orderBy(desc(citationScoreExpr))
    .limit(limit);

  logger.info(`Datasets: ${matchedDatasets.length}`);
  if (matchedDatasets.length === 0) return [];

  const datasetIds = matchedDatasets.map((d) => d.dataset.id);

  const allDataFiles = await db
    .select()
    .from(datasetFiles)
    .where(inArray(datasetFiles.datasetId, datasetIds));

  const dataFilesByDatasetId = Map.groupBy(allDataFiles, (f) => f.datasetId);

  return matchedDatasets.map(({ dataset, pmcDetails, citationScore }) => ({
    ...dataset,
    pmcDetails,
    dataFiles: dataFilesByDatasetId.get(dataset.id) ?? [],
    citationScore,
  }));
}

export async function updateDatasetDownloadStatus(
  extId: string,
  status: DownloadStatus,
): Promise<void> {
  await db
    .update(datasets)
    .set({ downloadStatus: status, updatedTimestamp: new Date() })
    .where(and(eq(datasets.source, "pmc"), eq(datasets.extId, extId)));
}

export async function updateDatasetFileDownloadStatus(
  fileId: number,
  status: DownloadStatus,
): Promise<void> {
  await db
    .update(datasetFiles)
    .set({ downloadStatus: status })
    .where(eq(datasetFiles.id, fileId));
}

export async function insertPdfDatasetFile(data: {
  datasetId: number;
  source: DatasetSource;
  filename: string;
  size: number;
}): Promise<number> {
  const [newFile] = await db
    .insert(datasetFiles)
    .values({
      datasetId: data.datasetId,
      source: data.source,
      filename: data.filename,
      fileType: "pdf",
      size: data.size,
      downloadStatus: "completed",
    })
    .returning();
  return newFile.id;
}

export async function getPmcDatasetFileS3Url(
  fileId: number,
): Promise<string | undefined> {
  const [detail] = await db
    .select()
    .from(pmcDatasetFileDetails)
    .where(eq(pmcDatasetFileDetails.datasetFileId, fileId))
    .limit(1);
  return detail?.s3Url;
}

export async function getAllExtPmcIds(): Promise<Set<string>> {
  const result = await db
    .select({ extId: datasets.extId })
    .from(datasets)
    .where(eq(datasets.source, "pmc"));
  return new Set(result.map((r) => r.extId));
}

// ============ Dryad-specific types ============

export type DryadDatasetDetailsRow = typeof dryadDatasetDetails.$inferSelect;
export type DryadFileDetailsRow = typeof dryadDatasetFileDetails.$inferSelect;
export type DatasetFileWithDryadDetails = DatasetFileRow & {
  dryadFileDetails?: DryadFileDetailsRow;
};
export type DryadDatasetWithFiles = DatasetRow & {
  dryadDetails: DryadDatasetDetailsRow;
  dataFiles: DatasetFileWithDryadDetails[];
};

// ============ Dryad-specific helpers ============

async function mergeDryadFileDetails(
  files: DatasetFileRow[],
): Promise<DatasetFileWithDryadDetails[]> {
  if (files.length === 0) return [];
  const fileIds = files.map((f) => f.id);
  const detailRows = await db
    .select()
    .from(dryadDatasetFileDetails)
    .where(inArray(dryadDatasetFileDetails.datasetFileId, fileIds));
  const detailByFileId = new Map(detailRows.map((r) => [r.datasetFileId, r]));
  return files.map((f) => ({
    ...f,
    dryadFileDetails: detailByFileId.get(f.id),
  }));
}

// ============ Dryad-specific queries ============

export async function getDryadDatasetByExtId(
  extId: number,
): Promise<DryadDatasetWithFiles | undefined> {
  const [match] = await db
    .select({
      dataset: datasets,
      dryadDetails: dryadDatasetDetails,
    })
    .from(datasets)
    .innerJoin(
      dryadDatasetDetails,
      eq(dryadDatasetDetails.datasetId, datasets.id),
    )
    .where(
      and(
        eq(datasets.source, "dryad"),
        eq(dryadDatasetDetails.extIdNumeric, extId),
      ),
    );

  if (!match) return undefined;

  const fileRows = await db
    .select()
    .from(datasetFiles)
    .where(eq(datasetFiles.datasetId, match.dataset.id));

  const dataFiles = await mergeDryadFileDetails(fileRows);

  return {
    ...match.dataset,
    dryadDetails: match.dryadDetails,
    dataFiles,
  };
}

export async function upsertDryadDataset(data: {
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
}): Promise<{ dataset: DatasetRow; isNew: boolean }> {
  return await db.transaction(async (tx) => {
    const [dataset] = await tx
      .insert(datasets)
      .values({
        source: "dryad",
        extId: String(data.extId),
        doi: data.datasetDoi,
        title: data.title,
        abstract: data.abstract,
        journalIssn: data.journalIssn,
        publicationDate: data.dryadPublicationDate,
        downloadStatus: data.downloadStatus ?? "not_started",
      })
      .onConflictDoUpdate({
        target: [datasets.source, datasets.extId],
        set: {
          doi: data.datasetDoi,
          title: data.title,
          abstract: data.abstract,
          journalIssn: data.journalIssn,
          publicationDate: data.dryadPublicationDate,
          updatedTimestamp: new Date(),
        },
      })
      .returning();

    await tx
      .insert(dryadDatasetDetails)
      .values({
        datasetId: dataset.id,
        extIdNumeric: data.extId,
        datasetDoi: data.datasetDoi,
        usageNotes: data.usageNotes,
        primaryArticleUrl: data.primaryArticleUrl,
        dryadLastModifiedDate: data.dryadLastModifiedDate,
        latestVersionId: data.latestVersionId,
        originalFileSize: data.originalFileSize,
      })
      .onConflictDoUpdate({
        target: dryadDatasetDetails.datasetId,
        set: {
          datasetDoi: data.datasetDoi,
          usageNotes: data.usageNotes,
          primaryArticleUrl: data.primaryArticleUrl,
          dryadLastModifiedDate: data.dryadLastModifiedDate,
          latestVersionId: data.latestVersionId,
          originalFileSize: data.originalFileSize,
        },
      });

    const isNew =
      dataset.indexedTimestamp.getTime() === dataset.updatedTimestamp.getTime();
    return { dataset, isNew };
  });
}

export async function upsertDryadDataFile(data: {
  datasetId: number;
  extFileId: number;
  filename: string;
  fileType: "excel" | "readme" | "pdf";
  size: number;
}): Promise<DatasetFileRow> {
  return await db.transaction(async (tx) => {
    const existingDetail = await tx
      .select()
      .from(dryadDatasetFileDetails)
      .where(eq(dryadDatasetFileDetails.extFileId, data.extFileId))
      .limit(1);

    if (existingDetail.length > 0) {
      const [updated] = await tx
        .update(datasetFiles)
        .set({
          datasetId: data.datasetId,
          filename: data.filename,
          fileType: data.fileType,
          size: data.size,
        })
        .where(eq(datasetFiles.id, existingDetail[0].datasetFileId))
        .returning();
      return updated;
    } else {
      const [newFile] = await tx
        .insert(datasetFiles)
        .values({
          datasetId: data.datasetId,
          source: "dryad",
          filename: data.filename,
          fileType: data.fileType,
          size: data.size,
          downloadStatus: "not_started",
        })
        .returning();

      await tx.insert(dryadDatasetFileDetails).values({
        datasetFileId: newFile.id,
        extFileId: data.extFileId,
      });

      return newFile;
    }
  });
}

export async function getAllDryadExtIds(): Promise<Set<number>> {
  const result = await db
    .select({ extIdNumeric: dryadDatasetDetails.extIdNumeric })
    .from(dryadDatasetDetails);
  return new Set(result.map((r) => r.extIdNumeric));
}

export async function getDryadDatasetsWithoutArticles(): Promise<
  DryadDatasetWithFiles[]
> {
  const matchedDatasets = await db
    .select({
      dataset: datasets,
      dryadDetails: dryadDatasetDetails,
    })
    .from(datasets)
    .innerJoin(
      dryadDatasetDetails,
      eq(dryadDatasetDetails.datasetId, datasets.id),
    )
    .where(and(eq(datasets.source, "dryad"), isNull(datasets.articleId)));

  if (matchedDatasets.length === 0) return [];
  const datasetIds = matchedDatasets.map((d) => d.dataset.id);

  const allFiles = await db
    .select()
    .from(datasetFiles)
    .where(inArray(datasetFiles.datasetId, datasetIds));

  const filesByDatasetId = Map.groupBy(allFiles, (f) => f.datasetId);

  return matchedDatasets.map((d) => ({
    ...d.dataset,
    dryadDetails: d.dryadDetails,
    dataFiles: filesByDatasetId.get(d.dataset.id) ?? [],
  }));
}

export async function getDryadDatasetsNotUpdatedSince(
  date: Date,
): Promise<DryadDatasetWithFiles[]> {
  const matchedDatasets = await db
    .select({
      dataset: datasets,
      dryadDetails: dryadDatasetDetails,
    })
    .from(datasets)
    .innerJoin(
      dryadDatasetDetails,
      eq(dryadDatasetDetails.datasetId, datasets.id),
    )
    .where(
      and(eq(datasets.source, "dryad"), lt(datasets.updatedTimestamp, date)),
    );

  if (matchedDatasets.length === 0) return [];
  const datasetIds = matchedDatasets.map((d) => d.dataset.id);

  const allFiles = await db
    .select()
    .from(datasetFiles)
    .where(inArray(datasetFiles.datasetId, datasetIds));

  const filesByDatasetId = Map.groupBy(allFiles, (f) => f.datasetId);

  return matchedDatasets.map((d) => ({
    ...d.dataset,
    dryadDetails: d.dryadDetails,
    dataFiles: filesByDatasetId.get(d.dataset.id) ?? [],
  }));
}

export async function getDryadDatasetsByDownloadStatusWithFiles(
  status: DownloadStatus,
  limit: number,
): Promise<DryadDatasetWithFiles[]> {
  const matchedDatasets = await db
    .select({
      dataset: datasets,
      dryadDetails: dryadDatasetDetails,
    })
    .from(datasets)
    .innerJoin(
      dryadDatasetDetails,
      eq(dryadDatasetDetails.datasetId, datasets.id),
    )
    .where(
      and(eq(datasets.source, "dryad"), eq(datasets.downloadStatus, status)),
    )
    .limit(limit);

  if (matchedDatasets.length === 0) return [];
  const datasetIds = matchedDatasets.map((d) => d.dataset.id);

  const allFiles = await db
    .select()
    .from(datasetFiles)
    .where(inArray(datasetFiles.datasetId, datasetIds));

  const allFilesWithDetails = await mergeDryadFileDetails(allFiles);
  const filesByDatasetId = Map.groupBy(allFilesWithDetails, (f) => f.datasetId);

  return matchedDatasets.map((d) => ({
    ...d.dataset,
    dryadDetails: d.dryadDetails,
    dataFiles: filesByDatasetId.get(d.dataset.id) ?? [],
  }));
}

export async function getDownloadedNotAnalyzedDryadDatasetsWithFiles(): Promise<
  DryadDatasetWithFiles[]
> {
  const matchedDatasets = await db
    .select({
      dataset: datasets,
      dryadDetails: dryadDatasetDetails,
    })
    .from(datasets)
    .innerJoin(
      dryadDatasetDetails,
      eq(dryadDatasetDetails.datasetId, datasets.id),
    )
    .where(
      and(
        eq(datasets.source, "dryad"),
        eq(datasets.downloadStatus, "completed"),
        inArray(datasets.analysisStatus, ["not_analyzed", "failed"]),
        or(isNull(datasets.isMetaAnalysis), eq(datasets.isMetaAnalysis, false)),
      ),
    );

  if (matchedDatasets.length === 0) return [];
  const datasetIds = matchedDatasets.map((d) => d.dataset.id);

  const allFiles = await db
    .select()
    .from(datasetFiles)
    .where(inArray(datasetFiles.datasetId, datasetIds));

  const allFilesWithDetails = await mergeDryadFileDetails(allFiles);
  const filesByDatasetId = Map.groupBy(allFilesWithDetails, (f) => f.datasetId);

  return matchedDatasets.map((d) => ({
    ...d.dataset,
    dryadDetails: d.dryadDetails,
    dataFiles: filesByDatasetId.get(d.dataset.id) ?? [],
  }));
}

export async function getDryadDatasetsForDownload(
  limit: number,
): Promise<(DryadDatasetWithFiles & { citationScore: number })[]> {
  const hasReadmeFile = exists(
    db
      .select()
      .from(datasetFiles)
      .where(
        and(
          eq(datasetFiles.datasetId, datasets.id),
          eq(datasetFiles.fileType, "readme"),
        ),
      ),
  );

  const excelFileCount = sql<number>`(
    SELECT COUNT(*) FROM dataset_files
    WHERE dataset_files.dataset_id = datasets.id
    AND dataset_files.file_type = 'excel'
  )`;

  const citationScoreExpr =
    sql<number>`COALESCE((COALESCE(${journals.sjrScore}, 0.0) + ${articles.numCitations}) * LOG(10.0 + COALESCE(${journals.sjrScore}, 0.0)) / (1.0 + COALESCE(CAST(CURRENT_DATE - ${articles.publicationDate} AS numeric) / 365.25, 10.0)), 0)`.as(
      "citationScore",
    );

  const matchedDatasets = await db
    .select({
      dataset: datasets,
      dryadDetails: dryadDatasetDetails,
      citationScore: citationScoreExpr,
    })
    .from(datasets)
    .innerJoin(
      dryadDatasetDetails,
      eq(dryadDatasetDetails.datasetId, datasets.id),
    )
    .leftJoin(articles, eq(datasets.articleId, articles.id))
    .leftJoin(journals, eq(articles.journalId, journals.id))
    .where(
      and(
        eq(datasets.source, "dryad"),
        eq(datasets.downloadStatus, "not_started"),
        or(isNotNull(dryadDatasetDetails.usageNotes), hasReadmeFile),
        sql`${excelFileCount} <= 3`,
      ),
    )
    .orderBy(desc(citationScoreExpr))
    .limit(limit);

  logger.info(`Datasets: ${matchedDatasets.length}`);
  if (matchedDatasets.length === 0) return [];

  const datasetIds = matchedDatasets.map((d) => d.dataset.id);

  const allFiles = await db
    .select()
    .from(datasetFiles)
    .where(inArray(datasetFiles.datasetId, datasetIds));

  const allFilesWithDetails = await mergeDryadFileDetails(allFiles);
  const filesByDatasetId = Map.groupBy(allFilesWithDetails, (f) => f.datasetId);

  return matchedDatasets.map(
    ({ dataset, dryadDetails: details, citationScore }) => ({
      ...dataset,
      dryadDetails: details,
      dataFiles: filesByDatasetId.get(dataset.id) ?? [],
      citationScore,
    }),
  );
}

export async function updateDryadDatasetDownloadStatus(
  extId: number,
  status: DownloadStatus,
): Promise<void> {
  const [detail] = await db
    .select({ datasetId: dryadDatasetDetails.datasetId })
    .from(dryadDatasetDetails)
    .where(eq(dryadDatasetDetails.extIdNumeric, extId))
    .limit(1);
  if (!detail) return;
  await db
    .update(datasets)
    .set({ downloadStatus: status, updatedTimestamp: new Date() })
    .where(eq(datasets.id, detail.datasetId));
}

export async function updateDryadDatasetAnalysisStatus(
  extId: number,
  status: AnalysisStatus,
): Promise<void> {
  const [detail] = await db
    .select({ datasetId: dryadDatasetDetails.datasetId })
    .from(dryadDatasetDetails)
    .where(eq(dryadDatasetDetails.extIdNumeric, extId))
    .limit(1);
  if (!detail) return;
  await db
    .update(datasets)
    .set({ analysisStatus: status, updatedTimestamp: new Date() })
    .where(eq(datasets.id, detail.datasetId));
}

export async function updateDryadDatasetIsMetaAnalysis(
  extId: number,
  isMetaAnalysis: boolean,
): Promise<void> {
  const [detail] = await db
    .select({ datasetId: dryadDatasetDetails.datasetId })
    .from(dryadDatasetDetails)
    .where(eq(dryadDatasetDetails.extIdNumeric, extId))
    .limit(1);
  if (!detail) return;
  await db
    .update(datasets)
    .set({ isMetaAnalysis, updatedTimestamp: new Date() })
    .where(eq(datasets.id, detail.datasetId));
}

export async function resetDryadAnalysisStatusesExceptFailed(): Promise<number> {
  const result = await db
    .update(datasets)
    .set({ analysisStatus: "not_analyzed", updatedTimestamp: new Date() })
    .where(
      and(
        eq(datasets.source, "dryad"),
        eq(datasets.downloadStatus, "completed"),
        inArray(datasets.analysisStatus, [
          "not_flagged_for_review",
          "flagged_for_review",
          "reviewed_by_ai",
          "pdf_reviewed_by_ai",
        ]),
      ),
    );
  return result.rowCount ?? 0;
}

export async function updateDryadDatasetDownloadStatusByCurrentStatus(
  currentStatus: DownloadStatus,
  newStatus: DownloadStatus,
): Promise<number> {
  const result = await db
    .update(datasets)
    .set({ downloadStatus: newStatus, updatedTimestamp: new Date() })
    .where(
      and(
        eq(datasets.source, "dryad"),
        eq(datasets.downloadStatus, currentStatus),
      ),
    );
  return result.rowCount ?? 0;
}

export async function getDryadDatasetCountByStatus(): Promise<
  Record<DownloadStatus, number>
> {
  const result = await db
    .select({
      status: datasets.downloadStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(datasets)
    .where(eq(datasets.source, "dryad"))
    .groupBy(datasets.downloadStatus);

  const counts: Record<DownloadStatus, number> = {
    not_started: 0,
    in_progress: 0,
    failed: 0,
    completed: 0,
    skipped: 0,
    api_forbidden: 0,
    api_not_found: 0,
    manually_added: 0,
  };

  for (const row of result) {
    counts[row.status] = row.count;
  }

  return counts;
}

export async function getDryadDatasetsByAnalysisStatusWithFiles(
  analysisStatus: AnalysisStatus,
): Promise<DryadDatasetWithFiles[]> {
  const matchedDatasets = await db
    .select({
      dataset: datasets,
      dryadDetails: dryadDatasetDetails,
    })
    .from(datasets)
    .innerJoin(
      dryadDatasetDetails,
      eq(dryadDatasetDetails.datasetId, datasets.id),
    )
    .where(
      and(
        eq(datasets.source, "dryad"),
        eq(datasets.analysisStatus, analysisStatus),
      ),
    );

  if (matchedDatasets.length === 0) return [];
  const datasetIds = matchedDatasets.map((d) => d.dataset.id);

  const allFiles = await db
    .select()
    .from(datasetFiles)
    .where(inArray(datasetFiles.datasetId, datasetIds));

  const allFilesWithDetails = await mergeDryadFileDetails(allFiles);
  const filesByDatasetId = Map.groupBy(allFilesWithDetails, (f) => f.datasetId);

  return matchedDatasets.map((d) => ({
    ...d.dataset,
    dryadDetails: d.dryadDetails,
    dataFiles: filesByDatasetId.get(d.dataset.id) ?? [],
  }));
}
