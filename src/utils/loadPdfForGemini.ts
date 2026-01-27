import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function loadPdfFile(options: {
  articleId: number;
  filename: string;
}): Promise<{
  filePath: string;
  fileBuffer: Buffer;
  mimeType: string;
}> {
  const filePath = join(
    process.cwd(),
    `data/pdfs/${options.articleId}/${options.filename}`,
  );

  const fileBuffer = await readFile(filePath);

  if (fileBuffer.length === 0) {
    throw new Error(`Failed to read PDF file from filepath ${filePath}: empty buffer`);
  }

  return {
    filePath,
    fileBuffer,
    mimeType: "application/pdf",
  };
}
