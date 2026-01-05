import { URLSearchParams } from "node:url";
import { DatasetResponseSchema, type DatasetResponse } from "./schemas";
import { fetchToken } from "./fetchToken";
import pRetry from "p-retry";
import { logger } from "../utils/logger";

const DRYAD_BASE_API_URL = "https://datadryad.org/api/v2";
type Params = {
  page: number;
  perPage: number;
};
export async function listDatasets({
  page,
  perPage,
}: Params): Promise<DatasetResponse> {
  logger.info(`Fetching page ${page} of datasets from Dryad...`);

  const accessToken = await fetchToken();
  const searchQueryParams = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const url = `${DRYAD_BASE_API_URL}/datasets?${searchQueryParams.toString()}`;
  const responseData = await pRetry(
    async (): Promise<unknown> => {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch datasets: ${response.status} ${response.statusText}`,
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

  const zodResult = DatasetResponseSchema.safeParse(responseData);
  if (!zodResult.success) {
    logger.warn(`Zod validation failed for ${url}`);
    logger.warn(JSON.stringify(responseData, null, 2));
    throw zodResult.error;
  }
  return zodResult.data;
}
