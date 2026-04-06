import { and, eq, inArray, or, isNull, exists, sql, desc } from "drizzle-orm";
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

export async function updatePmcDatasetFullText(
  datasetId: number,
  fullText: string,
): Promise<void> {
  await db
    .update(pmcDatasetDetails)
    .set({ fullText })
    .where(eq(pmcDatasetDetails.datasetId, datasetId));
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
