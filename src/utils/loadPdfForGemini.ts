import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { storagePaths } from "./paths/storagePaths";

export async function loadPdfFile(options: {
  source?: string;
  extId?: string;
  articleId: number;
  filename: string;
}): Promise<{
  filePath: string;
  fileBuffer: Buffer;
  mimeType: string;
}> {
  const filePath =
    options.source === "pmc" && options.extId
      ? join(storagePaths.pmcArticle(options.extId), options.filename)
      : join(storagePaths.pdfArticle(options.articleId), options.filename);

  const fileBuffer = await readFile(filePath);

  if (fileBuffer.length === 0) {
    throw new Error(
      `Failed to read PDF file from filepath ${filePath}: empty buffer`,
    );
  }

  return {
    filePath,
    fileBuffer,
    mimeType: "application/pdf",
  };
}
