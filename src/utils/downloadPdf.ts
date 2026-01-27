import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { logger } from "./logger";

type Params = {
  articleId: number;
  pdfUrl: string;
};

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

export async function downloadPdf({
  articleId,
  pdfUrl,
}: Params): Promise<{ filePath: string; filename: string; size: number }> {
  const downloadDir = join(process.cwd(), `data/pdfs/${articleId}`);

  await mkdir(downloadDir, { recursive: true });

  logger.info(`Downloading PDF for article ${articleId} from ${pdfUrl}`);

  const response = await fetch(pdfUrl, { redirect: "follow" });

  if (!response.ok) {
    throw new Error(
      `Failed to download PDF for article ${articleId}: ${response.status} ${response.statusText}`,
    );
  }

  if (!response.body) {
    throw new Error(`No response body for article ${articleId} PDF`);
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

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

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
