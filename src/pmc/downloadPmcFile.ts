import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { s3Fetch } from "./pmcFetch";
import { logger } from "../utils/logger";
import { storagePaths } from "../utils/paths/storagePaths";

type Params = {
  url: string;
  filename: string;
  pmcid: string;
};

export async function downloadPmcFile({
  url,
  filename,
  pmcid,
}: Params): Promise<string> {
  const downloadDir = storagePaths.pmcArticle(pmcid);
  const filePath = join(downloadDir, filename);

  await mkdir(dirname(filePath), { recursive: true });

  logger.info(`Downloading file: ${filename} from ${url}`);
  const response = await s3Fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download file ${filename}: ${response.status} ${response.statusText}`,
    );
  }

  if (!response.body) {
    throw new Error(`No response body for file ${filename}`);
  }

  const writeStream = createWriteStream(filePath);
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

  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", () => resolve());
    writeStream.on("error", reject);
  });

  return filePath;
}
