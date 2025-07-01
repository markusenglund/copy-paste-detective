import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const DRYAD_BASE_API_URL = "https://datadryad.org/api/v2";

type Params = {
  fileId: number;
  filename: string;
  datasetId: number;
};

export async function downloadFile({
  fileId,
  filename,
  datasetId,
}: Params): Promise<string> {
  const url = `${DRYAD_BASE_API_URL}/files/${fileId}/download`;

  // Create downloads directory structure: downloads/dataset_{datasetId}/filename
  const downloadDir = join(process.cwd(), "downloads", `dataset_${datasetId}`);
  const filePath = join(downloadDir, filename);

  // Ensure the directory exists
  await mkdir(dirname(filePath), { recursive: true });

  // Download the file
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download file ${filename}: ${response.status} ${response.statusText}`,
    );
  }

  if (!response.body) {
    throw new Error(`No response body for file ${filename}`);
  }

  // Create write stream
  const writeStream = createWriteStream(filePath);

  // Stream the response body directly to the file
  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      writeStream.write(value);
    }
  } finally {
    reader.releaseLock();
    writeStream.end();
  }

  // Wait for the write stream to finish
  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", () => resolve());
    writeStream.on("error", reject);
  });

  console.log(`Downloaded: ${filename} -> ${filePath}`);
  return filePath;
}
