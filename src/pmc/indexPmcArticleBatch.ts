import pMap from "p-map";
import { SearchResultArticle } from "./schemas";
import {
  getS3Metadata,
  s3UrlToHttps,
  getFilenameFromS3Url,
  isExcelFile,
  getFileSize,
} from "./getS3Metadata";
import { upsertPmcDataset } from "../repositories/pmcDatasets/pmcDatasetsRepository";
import { upsertPmcDataFile } from "../repositories/pmcDataFiles/pmcDataFilesRepository";
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

      // HEAD request each Excel file for sizes
      const excelFiles = await pMap(
        excelUrls,
        async (s3Url) => {
          const httpsUrl = s3UrlToHttps(s3Url);
          const size = await getFileSize(httpsUrl);
          return {
            filename: getFilenameFromS3Url(s3Url),
            s3Url,
            size,
          };
        },
        { concurrency: 5 },
      );

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
        supplementalFileUrls:
          s3Metadata.media_urls.length > 0 ? s3Metadata.media_urls : null,
        isMetaAnalysis: null,
      });

      // Upsert Excel data files
      for (const file of excelFiles) {
        await upsertPmcDataFile({
          pmcDatasetId: dataset.id,
          filename: file.filename,
          fileType: "excel",
          s3Url: file.s3Url,
          size: file.size,
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
