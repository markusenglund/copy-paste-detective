import pMap from "p-map";
import { SearchResultArticle } from "./schemas";
import {
  getS3Metadata,
  s3UrlToHttps,
  getFilenameFromS3Url,
  isExcelFile,
  getFileSize,
  getPmcXmlDerivedContent,
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

      try {
        await indexPmcArticle(extPmcArticle, alreadyIndexedPmcIds, result);
      } catch (error) {
        logger.warn(`Failed to index ${extPmcId} - ${error}`);
      }
    },
    { concurrency: 10 },
  );

  return result;
}

async function indexPmcArticle(
  extPmcArticle: SearchResultArticle,
  alreadyIndexedPmcIds: Set<string>,
  result: IndexBatchResult,
): Promise<void> {
  const extPmcId = extPmcArticle.pmcid;

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

  // Fetch derived content from XML
  let captions = new Map<string, string>();
  let fullText: string | null = null;
  if (s3Metadata.xml_url) {
    const derivedContent = await getPmcXmlDerivedContent(s3Metadata.xml_url);
    captions = derivedContent.captions;
    fullText = derivedContent.fullText;
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
    fullPdfUrl: s3Metadata.pdf_url ? s3UrlToHttps(s3Metadata.pdf_url) : null,
    textUrl: s3Metadata.text_url ? s3UrlToHttps(s3Metadata.text_url) : null,
    xmlUrl: s3Metadata.xml_url ? s3UrlToHttps(s3Metadata.xml_url) : null,
    fullText,
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
}
