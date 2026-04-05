import pMap from "p-map";
import { SearchResultArticle } from "./schemas";
import {
  getS3Metadata,
  s3UrlToHttps,
  getFilenameFromS3Url,
  isExcelFile,
  getFileSize,
  getSupplementaryCaptions,
} from "./getS3Metadata";
import {
  upsertPmcDataset,
  upsertPmcDataFile,
} from "../repositories/datasets/unifiedDatasetsRepository";
import { logger } from "../utils/logger";

export interface IndexBatchResult {
  indexed: number;
  indexedWithExcel: number;
  skippedAlreadyIndexed: number;
  skippedNoS3: number;
}

export async function indexPmcArticleBatch(
  extPmcArticles: SearchResultArticle[],
  alreadyIndexedPmcIds: Set<string>,
): Promise<IndexBatchResult> {
  const result: IndexBatchResult = {
    indexed: 0,
    indexedWithExcel: 0,
    skippedAlreadyIndexed: 0,
    skippedNoS3: 0,
  };

  await pMap(
    extPmcArticles,
    async (extPmcArticle) => {
      const extPmcId = extPmcArticle.pmcid;

      if (alreadyIndexedPmcIds.has(extPmcId)) {
        result.skippedAlreadyIndexed++;
        return;
      }

      // Fetch S3 metadata
      const s3Metadata = await getS3Metadata(extPmcId);
      if (!s3Metadata) {
        result.skippedNoS3++;
        return;
      }

      // Filter for Excel files
      const excelUrls = s3Metadata.media_urls.filter((url) =>
        isExcelFile(getFilenameFromS3Url(url)),
      );

      // HEAD request each Excel file for sizes (skip files where HEAD fails)
      const excelFilesWithNulls = await pMap(
        excelUrls,
        async (s3Url) => {
          const httpsUrl = s3UrlToHttps(s3Url);
          const size = await getFileSize(httpsUrl);
          if (size === null) return null;
          return {
            filename: getFilenameFromS3Url(s3Url),
            s3Url,
            size,
          };
        },
        { concurrency: 5 },
      );
      const excelFiles = excelFilesWithNulls.filter(
        (f): f is NonNullable<typeof f> => f !== null,
      );

      // Fetch supplementary captions from XML (best-effort)
      let captions = new Map<string, string>();
      if (s3Metadata.xml_url && excelFiles.length > 0) {
        captions = await getSupplementaryCaptions(s3Metadata.xml_url);
      }

      // Extract journal ISSN from core response
      const journalIssn = extPmcArticle.journalInfo?.journal?.issn ?? null;

      // Upsert dataset
      const { dataset, isNew } = await upsertPmcDataset({
        extPmcId,
        extPmid: extPmcArticle.pmid ?? null,
        pmcVersion: s3Metadata.version,
        doi: extPmcArticle.doi ?? s3Metadata.doi,
        title: extPmcArticle.title,
        abstract: extPmcArticle.abstractText ?? null,
        authorString: extPmcArticle.authorString ?? null,
        journalIssn,
        pmcPublicationDate: extPmcArticle.firstPublicationDate,
        numCitations: extPmcArticle.citedByCount,
        license: s3Metadata.license_code,
        isRetracted: s3Metadata.is_retracted,
        fullPdfUrl: s3Metadata.pdf_url
          ? s3UrlToHttps(s3Metadata.pdf_url)
          : null,
        textUrl: s3Metadata.text_url ? s3UrlToHttps(s3Metadata.text_url) : null,
        supplementalFileUrls:
          s3Metadata.media_urls.length > 0 ? s3Metadata.media_urls : null,
        isMetaAnalysis: null,
      });

      // Upsert Excel data files
      const xmlHttpsUrl = s3Metadata.xml_url
        ? s3UrlToHttps(s3Metadata.xml_url)
        : null;
      for (const file of excelFiles) {
        const caption = captions.get(file.filename) ?? null;
        if (!caption && xmlHttpsUrl) {
          logger.warn(
            `No caption found for ${file.filename} in ${extPmcId} ${xmlHttpsUrl}`,
          );
        }
        await upsertPmcDataFile({
          pmcDatasetId: dataset.id,
          filename: file.filename,
          fileType: "excel",
          s3Url: file.s3Url,
          size: file.size,
          caption,
        });
      }

      alreadyIndexedPmcIds.add(extPmcId);
      result.indexed++;
      if (excelFiles.length > 0) {
        result.indexedWithExcel++;
      }

      if (excelFiles.length > 0) {
        const action = isNew ? "Inserted" : "Updated";
        logger.info(
          `${action} ${extPmcId} with ${excelFiles.length} Excel files (cited: ${extPmcArticle.citedByCount}): ${excelFiles.map((f) => f.filename).join(", ")}`,
        );
      }
    },
    { concurrency: 10 },
  );

  return result;
}
