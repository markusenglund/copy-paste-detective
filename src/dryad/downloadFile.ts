import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fetchToken } from "./fetchToken";

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
  const accessToken = await fetchToken();

  const downloadDir = join(process.cwd(), `data/dryad/files/${datasetId}`);
  const filePath = join(downloadDir, filename);

  // Ensure the directory exists
  await mkdir(dirname(filePath), { recursive: true });

  console.log(`Downloading file: ${filename} from ${url}`);
  // Download the file
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

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

  return filePath;
}
