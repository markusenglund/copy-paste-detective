import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { config } from "../config/env";
import { logger } from "./logger";
import { storagePaths } from "./paths/storagePaths";

type Params = {
  articleId: number;
  openalexId: string;
};

export function validatePdfMagicBytes(chunk: Uint8Array): boolean {
  // PDF magic bytes: %PDF-
  const pdfMagicBytes = [0x25, 0x50, 0x44, 0x46, 0x2d];

  if (chunk.length < pdfMagicBytes.length) {
    return false;
  }

  for (let i = 0; i < pdfMagicBytes.length; i++) {
    if (chunk[i] !== pdfMagicBytes[i]) {
      return false;
    }
  }

  return true;
}

function extractFilenameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = basename(pathname);
    if (filename && filename.endsWith(".pdf")) {
      return filename;
    }
    return null;
  } catch {
    return null;
  }
}

function extractFilenameFromResponse(
  response: Response,
  url: string,
  articleId: number,
): string {
  const contentDisposition = response.headers.get("content-disposition");
  if (contentDisposition) {
    const match = contentDisposition.match(
      /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
    );
    if (match?.[1]) {
      return match[1].replace(/['"]/g, "");
    }
  }

  const urlFilename = extractFilenameFromUrl(url);
  if (urlFilename) return urlFilename;

  return `article_${articleId}.pdf`;
}

export function buildOpenalexContentUrl(openalexId: string): string {
  const workId = openalexId.replace("https://openalex.org/", "");
  return `https://content.openalex.org/works/${workId}.pdf?api_key=${config.openAlexApiKey}`;
}

export async function downloadPdf({
  articleId,
  openalexId,
}: Params): Promise<{ filePath: string; filename: string; size: number }> {
  const downloadDir = storagePaths.pdfArticle(articleId);

  await mkdir(downloadDir, { recursive: true });

  const pdfUrl = buildOpenalexContentUrl(openalexId);

  logger.info(`Downloading PDF for article ${articleId} from OpenAlex`);

  const response = await fetch(pdfUrl, { redirect: "follow" });

  if (!response.ok) {
    throw new Error(
      `Failed to download PDF for article ${articleId}: ${response.status} ${response.statusText}`,
    );
  }

  if (!response.body) {
    throw new Error(`No response body for article ${articleId} PDF`);
  }

  // Validate Content-Type header
  const contentType = response.headers.get("content-type");
  if (
    contentType &&
    !contentType.includes("application/pdf") &&
    !contentType.includes("application/octet-stream") &&
    !contentType.includes("binary/octet-stream")
  ) {
    throw new Error(
      `Invalid Content-Type for article ${articleId} PDF '${pdfUrl}' - expected "application/pdf", got "${contentType}"`,
    );
  }

  // Check the size of the file
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size === 0) {
      throw new Error(`The file is empty.`);
    }
  }

  const filename = extractFilenameFromResponse(response, pdfUrl, articleId);
  const filePath = join(downloadDir, filename);

  const writeStream = createWriteStream(filePath);

  const reader = response.body.getReader();
  let size = 0;
  let isFirstChunk = true;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Validate PDF magic bytes on first chunk
      if (isFirstChunk) {
        if (!validatePdfMagicBytes(value)) {
          throw new Error(
            `Downloaded file for article ${articleId} is not a valid PDF: missing PDF signature`,
          );
        }
        isFirstChunk = false;
      }

      size += value.length;
      writeStream.write(value);
    }
  } finally {
    reader.releaseLock();
    writeStream.end();
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", () => resolve());
    writeStream.on("error", reject);
  });

  return { filePath, filename, size };
}
