import { db } from "../../db";
import { DownloadStatus } from "../../db/shared/enums";
import { pmcDatasets } from "./schema";
import { and, desc, eq, exists, inArray, isNull, sql } from "drizzle-orm";
import { pmcDataFiles } from "../pmcDataFiles/schema";
import { articles } from "../articles/schema";
import { journals } from "../journals/schema";
import type { PmcDataFileRow } from "../pmcDataFiles/pmcDataFilesRepository";
import { logger } from "../../utils/logger";

export type PmcDataset = typeof pmcDatasets.$inferSelect;

export type PmcDatasetWithFiles = PmcDataset & {
  dataFiles: PmcDataFileRow[];
};

export async function getPmcDatasetsWithoutArticles(
  limit?: number,
): Promise<PmcDataset[]> {
  const query = db
    .select()
    .from(pmcDatasets)
    .where(
      and(
        isNull(pmcDatasets.articleId),
        exists(
          db
            .select()
            .from(pmcDataFiles)
            .where(eq(pmcDataFiles.pmcDatasetId, pmcDatasets.id)),
        ),
      ),
    );
  const results = await query;
  return limit ? results.slice(0, limit) : results;
}

export async function getPmcDatasetByExtPmcId(
  extPmcId: string,
): Promise<PmcDataset | undefined> {
  const [result] = await db
    .select()
    .from(pmcDatasets)
    .where(eq(pmcDatasets.extPmcId, extPmcId));
  return result;
}

export async function updatePmcDatasetArticleId(
  pmcDatasetId: number,
  articleId: number,
): Promise<void> {
  await db
    .update(pmcDatasets)
    .set({ articleId, updatedTimestamp: new Date() })
    .where(eq(pmcDatasets.id, pmcDatasetId));
}

export async function getAllExtPmcIds(): Promise<Set<string>> {
  const result = await db
    .select({ extPmcId: pmcDatasets.extPmcId })
    .from(pmcDatasets);
  return new Set(result.map((r) => r.extPmcId));
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
  supplementalFileUrls: string[] | null;
  isMetaAnalysis: boolean | null;
}): Promise<{ dataset: PmcDataset; isNew: boolean }> {
  const [result] = await db
    .insert(pmcDatasets)
    .values({
      ...data,
      downloadStatus: "not_started",
    })
    .onConflictDoUpdate({
      target: pmcDatasets.extPmcId,
      set: {
        pmcVersion: data.pmcVersion,
        extPmid: data.extPmid,
        doi: data.doi,
        title: data.title,
        abstract: data.abstract,
        authorString: data.authorString,
        journalIssn: data.journalIssn,
        pmcPublicationDate: data.pmcPublicationDate,
        numCitations: data.numCitations,
        license: data.license,
        isRetracted: data.isRetracted,
        fullPdfUrl: data.fullPdfUrl,
        supplementalFileUrls: data.supplementalFileUrls,
        isMetaAnalysis: data.isMetaAnalysis,
        updatedTimestamp: new Date(),
      },
    })
    .returning();

  const isNew =
    result.indexedTimestamp.getTime() === result.updatedTimestamp.getTime();
  return { dataset: result, isNew };
}

export async function getPmcDatasetWithFiles(
  extPmcId: string,
): Promise<PmcDatasetWithFiles | undefined> {
  const dataset = await getPmcDatasetByExtPmcId(extPmcId);
  if (!dataset) return undefined;

  const dataFiles = await db
    .select()
    .from(pmcDataFiles)
    .where(eq(pmcDataFiles.pmcDatasetId, dataset.id));

  return { ...dataset, dataFiles };
}

export async function updatePmcDatasetDownloadStatus(
  extPmcId: string,
  status: DownloadStatus,
): Promise<void> {
  await db
    .update(pmcDatasets)
    .set({ downloadStatus: status, updatedTimestamp: new Date() })
    .where(eq(pmcDatasets.extPmcId, extPmcId));
}

export async function getPmcDatasetsForDownload(
  limit: number,
): Promise<(PmcDatasetWithFiles & { citationScore: number })[]> {
  const dataFileCount = sql<number>`(
    SELECT COUNT(*) FROM pmc_data_files
    WHERE pmc_data_files.pmc_dataset_id = pmc_datasets.id
  )`;

  const citationScoreExpr =
    sql<number>`COALESCE((COALESCE(${journals.sjrScore}, 0.0) + ${articles.numCitations}) * LOG(10.0 + COALESCE(${journals.sjrScore}, 0.0)) / (1.0 + COALESCE(CAST(CURRENT_DATE - ${articles.publicationDate} AS numeric) / 365.25, 10.0)), 0)`.as(
      "citationScore",
    );

  const datasets = await db
    .select({ dataset: pmcDatasets, citationScore: citationScoreExpr })
    .from(pmcDatasets)
    .leftJoin(articles, eq(pmcDatasets.articleId, articles.id))
    .leftJoin(journals, eq(articles.journalId, journals.id))
    .where(
      and(
        eq(pmcDatasets.downloadStatus, "not_started"),
        exists(
          db
            .select()
            .from(pmcDataFiles)
            .where(eq(pmcDataFiles.pmcDatasetId, pmcDatasets.id)),
        ),
        sql`${dataFileCount} <= 3`,
      ),
    )
    .orderBy(desc(citationScoreExpr))
    .limit(limit);

  logger.info(`Datasets: ${datasets.length}`);
  if (datasets.length === 0) return [];

  const datasetIds = datasets.map((d) => d.dataset.id);

  const allDataFiles = await db
    .select()
    .from(pmcDataFiles)
    .where(inArray(pmcDataFiles.pmcDatasetId, datasetIds));

  const dataFilesByDatasetId = Map.groupBy(allDataFiles, (f) => f.pmcDatasetId);

  return datasets.map(({ dataset, citationScore }) => ({
    ...dataset,
    dataFiles: dataFilesByDatasetId.get(dataset.id) ?? [],
    citationScore,
  }));
}
