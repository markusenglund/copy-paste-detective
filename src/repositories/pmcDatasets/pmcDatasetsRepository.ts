import { db } from "../../db";
import { pmcDatasets } from "./schema";

export type PmcDataset = typeof pmcDatasets.$inferSelect;

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
