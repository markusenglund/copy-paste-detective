import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { storagePaths } from "./paths/storagePaths";

export async function loadPdfFile(options: {
  articleId: number;
  filename: string;
}): Promise<{
  filePath: string;
  fileBuffer: Buffer;
  mimeType: string;
}> {
  const filePath = join(
    storagePaths.pdfArticle(options.articleId),
    options.filename,
  );

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
