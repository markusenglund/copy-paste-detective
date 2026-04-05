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
  isArray: (name): boolean => name === "CommonPrefixes",
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

// JATS XML parsing for supplementary material captions
// Uses preserveOrder mode to correctly handle mixed content (text interleaved
// with inline elements like <xref>, <italic>, <ext-link>).

type OrderedNode = Record<string, unknown>;

const jatsCaptionParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: true,
  trimValues: false,
});

function extractOrderedText(nodes: unknown): string {
  if (!Array.isArray(nodes)) return "";
  let text = "";
  for (const node of nodes as OrderedNode[]) {
    if (typeof node["#text"] === "string") {
      text += node["#text"];
    } else if (typeof node["#text"] === "number") {
      text += String(node["#text"]);
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "#text" || key === ":@") continue;
      text += extractOrderedText(value);
    }
  }
  return text;
}

type ParsedElement = { content: OrderedNode[]; attrs: Record<string, string> };

function findChildren(nodes: OrderedNode[], tagName: string): ParsedElement[] {
  const results: ParsedElement[] = [];
  for (const node of nodes) {
    if (tagName in node) {
      const attrs = (node[":@"] ?? {}) as Record<string, string>;
      results.push({ content: node[tagName] as OrderedNode[], attrs });
    }
  }
  return results;
}

function findDescendants(
  nodes: OrderedNode[],
  tagName: string,
): ParsedElement[] {
  const results: ParsedElement[] = [];
  for (const node of nodes) {
    if (tagName in node) {
      const attrs = (node[":@"] ?? {}) as Record<string, string>;
      results.push({ content: node[tagName] as OrderedNode[], attrs });
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "#text" || key === ":@") continue;
      if (Array.isArray(value)) {
        results.push(...findDescendants(value as OrderedNode[], tagName));
      }
    }
  }
  return results;
}

function getFilenameFromHref(href: string): string {
  return href.split("/").pop() ?? href;
}

function buildFullCaption(
  label: string | null,
  caption: string | null,
): string | null {
  if (!caption && !label) return null;
  if (!caption) return label;
  if (!label || caption.startsWith(label)) return caption;
  return `${label}: ${caption}`;
}

export function extractCaptionsFromParsedXml(xml: string): Map<string, string> {
  const captions = new Map<string, string>();

  const parsed = jatsCaptionParser.parse(xml) as OrderedNode[];

  // Search for supplementary-material elements anywhere in the document tree,
  // since different publishers nest them in different locations:
  // - directly under <back> (e.g. PMC2845662)
  // - under <back> > <app-group> > <app> (e.g. PMC7175788)
  // - under <body> > <sec> > <fig> > <caption> > <p> (e.g. PMC5927771)
  // - under <back> > <sec> > <p> (e.g. PMC6185992)
  const suppMaterials = findDescendants(parsed, "supplementary-material");

  for (const supp of suppMaterials) {
    const labels = findChildren(supp.content, "label");
    const suppLabel =
      labels.length > 0 ? extractOrderedText(labels[0].content).trim() : null;

    const suppCaptions = findChildren(supp.content, "caption");
    const suppCaption =
      suppCaptions.length > 0
        ? extractOrderedText(suppCaptions[0].content).trim()
        : null;

    // Pattern A: <media xlink:href="..."> inside <supplementary-material>
    // The meaningful caption is typically on the parent <supplementary-material>,
    // not on the <media> element (which often just says "Click here...")
    const mediaElements = findChildren(supp.content, "media");
    for (const media of mediaElements) {
      const href = media.attrs["@_xlink:href"];
      if (!href) continue;

      const filename = getFilenameFromHref(href);
      const mediaCaptions = findChildren(media.content, "caption");
      const mediaCaption =
        mediaCaptions.length > 0
          ? extractOrderedText(mediaCaptions[0].content).trim()
          : null;

      // Prefer parent supplementary-material caption, fall back to media caption
      const caption = suppCaption ?? mediaCaption;
      const fullCaption = buildFullCaption(suppLabel, caption);
      if (fullCaption) {
        captions.set(filename, fullCaption);
      }
    }

    // Pattern B: <supplementary-material xlink:href="..."> (no media wrapper)
    const directHref = supp.attrs["@_xlink:href"];
    if (directHref) {
      const filename = getFilenameFromHref(directHref);
      if (!captions.has(filename)) {
        const fullCaption = buildFullCaption(suppLabel, suppCaption);
        if (fullCaption) {
          captions.set(filename, fullCaption);
        }
      }
    }
  }

  return captions;
}

export async function getSupplementaryCaptions(
  xmlS3Url: string,
): Promise<Map<string, string>> {
  const url = s3UrlToHttps(xmlS3Url);

  let response: Response;
  try {
    response = await s3FetchWithRetry(url);
  } catch (error) {
    logger.warn(`Failed to fetch XML for caption extraction ${url} - ${error}`);
    return new Map();
  }

  if (!response.ok) {
    logger.warn(
      `XML fetch returned ${response.status} ${response.statusText} ${url}`,
    );
    return new Map();
  }

  const xml = await response.text();
  const captions = extractCaptionsFromParsedXml(xml);
  if (captions.size === 0) {
    logger.warn(`No supplementary captions found in ${url}`);
  }
  return captions;
}
