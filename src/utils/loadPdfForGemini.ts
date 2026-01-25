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

  return {
    filePath,
    fileBuffer,
    mimeType: "application/pdf",
  };
}
