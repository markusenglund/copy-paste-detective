import { Command } from "@commander-js/extra-typings";
import { logger } from "../utils/logger";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { storagePaths } from "../utils/paths/storagePaths";

const PMCID = "PMC7305608";
const S3_BASE = "https://pmc-oa-opendata.s3.amazonaws.com";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface S3Metadata {
  pmcid: string;
  version: number;
  pmid: number | null;
  doi: string | null;
  title: string;
  citation: string;
  is_pmc_openaccess: boolean;
  is_manuscript: boolean;
  is_historical_ocr: boolean;
  is_retracted: boolean;
  license_code: string | null;
  xml_url: string;
  pdf_url: string | null;
  text_url: string;
  media_urls: string[];
}

function s3UrlToHttps(s3Url: string): string {
  return s3Url
    .replace("s3://pmc-oa-opendata/", `${S3_BASE}/`)
    .replace(/\?md5=.*$/, "");
}

function getFilename(s3Url: string): string {
  const withoutParams = s3Url.replace(/\?.*$/, "");
  return withoutParams.split("/").pop()!;
}

function isExcelFile(filename: string): boolean {
  return filename.endsWith(".xlsx") || filename.endsWith(".xls");
}

async function getFileSize(url: string): Promise<number | null> {
  const response = await fetch(url, { method: "HEAD" });
  if (!response.ok) return null;
  const contentLength = response.headers.get("content-length");
  return contentLength ? parseInt(contentLength) : null;
}

async function downloadToFile(url: string, filePath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, buffer);
}

const program = new Command();

program
  .name("pmc-probe-article")
  .description("Probe a specific PMC article for metadata and Excel files")
  .version("0.1.0")
  .action(async () => {
    try {
      const outputDir = storagePaths.pmcArticle(PMCID);
      await mkdir(outputDir, { recursive: true });

      // 1. Get search metadata from Europe PMC (with resultType=core for abstract)
      logger.info("=== SEARCH METADATA (Europe PMC) ===");
      const searchUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMCID:${PMCID}&format=json&resultType=core`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      const article = searchData.resultList?.result?.[0];
      console.log({
        pmcid: article.pmcid,
        pmid: article.pmid,
        doi: article.doi,
        title: article.title,
        journalTitle: article.journalTitle,
        journalIssn: article.journalIssn,
        firstPublicationDate: article.firstPublicationDate,
        citedByCount: article.citedByCount,
        hasSuppl: article.hasSuppl,
        abstractText: article.abstractText?.substring(0, 200) + "...",
      });

      // 2. Get S3 metadata (includes media_urls for supplementary files)
      logger.info("=== S3 METADATA ===");
      const metadataUrl = `${S3_BASE}/${PMCID}.1/${PMCID}.1.json`;
      logger.info(`Fetching: ${metadataUrl}`);
      const metadataResponse = await fetch(metadataUrl);
      if (!metadataResponse.ok) {
        throw new Error(
          `Failed to fetch S3 metadata: ${metadataResponse.status}`,
        );
      }
      const metadata: S3Metadata = await metadataResponse.json();

      // Save metadata JSON
      const metadataPath = path.join(outputDir, `${PMCID}.json`);
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      logger.info(`Saved metadata: ${metadataPath}`);

      console.log({
        pmcid: metadata.pmcid,
        doi: metadata.doi,
        title: metadata.title,
        citation: metadata.citation,
        license: metadata.license_code,
        isRetracted: metadata.is_retracted,
        hasPdf: !!metadata.pdf_url,
        hasText: !!metadata.text_url,
        totalMediaFiles: metadata.media_urls.length,
      });

      // 3. Download PDF
      if (metadata.pdf_url) {
        logger.info("=== DOWNLOADING PDF ===");
        const pdfUrl = s3UrlToHttps(metadata.pdf_url);
        const pdfPath = path.join(outputDir, `${PMCID}.pdf`);
        await downloadToFile(pdfUrl, pdfPath);
        const pdfSize = await getFileSize(pdfUrl);
        logger.info(
          `Downloaded PDF: ${pdfPath} (${pdfSize ? (pdfSize / 1024).toFixed(0) + " KB" : "unknown size"})`,
        );
      }

      // 4. Download full text (plain text)
      logger.info("=== DOWNLOADING FULL TEXT ===");
      const textUrl = s3UrlToHttps(metadata.text_url);
      const textPath = path.join(outputDir, `${PMCID}.txt`);
      await downloadToFile(textUrl, textPath);
      const textSize = await getFileSize(textUrl);
      logger.info(
        `Downloaded text: ${textPath} (${textSize ? (textSize / 1024).toFixed(0) + " KB" : "unknown size"})`,
      );

      // 5. Filter media_urls for Excel files, check sizes, and download
      const excelUrls = metadata.media_urls.filter((url) =>
        isExcelFile(getFilename(url)),
      );

      logger.info(`=== EXCEL FILES: ${excelUrls.length} ===`);

      for (const s3Url of excelUrls) {
        const filename = getFilename(s3Url);
        const httpsUrl = s3UrlToHttps(s3Url);
        const size = await getFileSize(httpsUrl);

        const sizeStr = size
          ? `${(size / 1024).toFixed(0)} KB`
          : "unknown size";
        logger.info(`${filename}: ${sizeStr}`);

        if (size && size > MAX_FILE_SIZE) {
          logger.warn(`Skipping ${filename}: exceeds 10MB limit`);
          continue;
        }

        const filePath = path.join(outputDir, filename);
        await downloadToFile(httpsUrl, filePath);
        logger.info(`Downloaded: ${filePath}`);
      }

      logger.info(`All files saved to: ${outputDir}`);
    } catch (error) {
      logger.error(error, "Failed to probe article");
      process.exit(1);
    }
  });

program.parse();
