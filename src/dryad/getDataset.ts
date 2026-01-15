import { fetchToken } from "./fetchToken";
import {
  DatasetSchema,
  ForbiddenDatasetSchema,
  type Dataset,
  type ForbiddenDataset,
} from "./schemas";
import pRetry from "p-retry";
import { logger } from "../utils/logger";
import { z } from "zod";
import { dryadFetch } from "./dryadFetch";

const DRYAD_BASE_API_URL = "https://datadryad.org/api/v2";

export async function getDataset(
  extId: number,
): Promise<Dataset | ForbiddenDataset> {
  logger.info(`Fetching dataset ${extId} from Dryad...`);

  const accessToken = await fetchToken();
  const url = `${DRYAD_BASE_API_URL}/datasets/${extId}`;

  const responseData = await pRetry(
    async (): Promise<unknown> => {
      const response = await dryadFetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch dataset: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      return data;
    },
    {
      retries: 1,
      onFailedAttempt: (error) => {
        logger.warn(`${error.message}, retrying once...`);
      },
    },
  );

  // Try to parse as either a regular dataset or a forbidden dataset
  const datasetUnionSchema = z.union([DatasetSchema, ForbiddenDatasetSchema]);
  const zodResult = datasetUnionSchema.safeParse(responseData);

  if (!zodResult.success) {
    logger.warn(`Zod validation failed for ${url}`);
    logger.warn(JSON.stringify(responseData, null, 2));
    throw zodResult.error;
  }

  return zodResult.data;
}
