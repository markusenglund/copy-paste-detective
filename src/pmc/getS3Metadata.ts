import { XMLParser } from "fast-xml-parser";
import { s3Fetch } from "./pmcFetch";
import {
  S3Metadata,
  S3MetadataSchema,
  S3ListBucketResultSchema,
} from "./schemas";
import { logger } from "../utils/logger";

const S3_BASE = "https://pmc-oa-opendata.s3.amazonaws.com";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const xmlParser = new XMLParser({
  isArray: (name) => name === "CommonPrefixes",
});

async function s3FetchWithRetry(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await s3Fetch(url, options);
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Fetch failed for ${url} after ${MAX_RETRIES} attempts - ${error}`,
        );
      }
      logger.warn(
        `Fetch failed for ${url} (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  throw new Error("Unreachable");
}

async function getLatestVersion(pmcid: string): Promise<number | null> {
  const url = `${S3_BASE}/?list-type=2&prefix=${pmcid}.&delimiter=/`;
  const response = await s3FetchWithRetry(url);

  if (!response.ok) {
    logger.warn(
      `S3 prefix listing failed with ${response.status} ${response.statusText} ${url}`,
    );
    return null;
  }

  const xml = await response.text();
  const rawParsed = xmlParser.parse(xml);
  const parseResult = S3ListBucketResultSchema.safeParse(rawParsed);

  if (!parseResult.success) {
    logger.warn(
      `S3 prefix listing parse failed for ${pmcid} ${url} - ${parseResult.error.message}`,
    );
    return null;
  }

  const prefixes = parseResult.data.ListBucketResult.CommonPrefixes;
  if (!prefixes || prefixes.length === 0) {
    return null;
  }

  let maxVersion = 0;
  for (const entry of prefixes) {
    // Prefix looks like "PMC1234567.2/"
    const versionStr = entry.Prefix.replace(`${pmcid}.`, "").replace("/", "");
    const version = parseInt(versionStr);
    if (!isNaN(version) && version > maxVersion) {
      maxVersion = version;
    }
  }

  return maxVersion > 0 ? maxVersion : null;
}

export async function getS3Metadata(pmcid: string): Promise<S3Metadata | null> {
  const version = await getLatestVersion(pmcid);
  if (version === null) {
    logger.warn(
      `No S3 versions found for ${pmcid} ${S3_BASE}/?list-type=2&prefix=${pmcid}.&delimiter=/`,
    );
    return null;
  }

  const versionedId = `${pmcid}.${version}`;
  const url = `${S3_BASE}/${versionedId}/${versionedId}.json`;
  const response = await s3FetchWithRetry(url);

  if (!response.ok) {
    if (response.status === 404 || response.status === 403) {
      logger.warn(
        `S3 metadata not found for ${pmcid} at version ${version} ${url}`,
      );
      return null;
    }
    throw new Error(
      `S3 metadata fetch error for ${pmcid}: ${response.status} ${response.statusText}`,
    );
  }

  const json = await response.json();
  const result = S3MetadataSchema.safeParse(json);
  if (!result.success) {
    logger.info(`S3 metadata validation failed for URL: ${url}`);
    throw new Error(`S3 metadata error for ${pmcid}: ${result.error.message}`);
  }
  return result.data;
}

export function s3UrlToHttps(s3Url: string): string {
  return s3Url
    .replace("s3://pmc-oa-opendata/", `${S3_BASE}/`)
    .replace(/\?md5=.*$/, "");
}

export function getFilenameFromS3Url(s3Url: string): string {
  const withoutParams = s3Url.replace(/\?.*$/, "");
  return withoutParams.split("/").pop()!;
}

export function isExcelFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

export async function getFileSize(url: string): Promise<number | null> {
  const response = await s3FetchWithRetry(url, { method: "HEAD" });
  if (!response.ok) return null;
  const contentLength = response.headers.get("content-length");
  return contentLength ? parseInt(contentLength) : null;
}
