import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { storagePaths } from "./paths/storagePaths";

export async function loadPdfFile(options: {
  source: string;
  extId: string;
  filename: string;
}): Promise<{
  filePath: string;
  fileBuffer: Buffer;
  mimeType: string;
}> {
  const dir =
    options.source === "pmc"
      ? storagePaths.pmcArticle(options.extId)
      : storagePaths.dryadDataset(options.extId);
  const filePath = join(dir, options.filename);

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
