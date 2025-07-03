import { URLSearchParams } from "node:url";
import { DatasetResponseSchema, type DatasetResponse } from "./schemas";
import { fetchToken } from "./fetchToken";
import pRetry from "p-retry";

const DRYAD_BASE_API_URL = "https://datadryad.org/api/v2";
type Params = {
  page: number;
  perPage: number;
};
export async function listDatasets({
  page,
  perPage,
}: Params): Promise<DatasetResponse> {
  console.log(`Fetching page ${page} of datasets from Dryad...`);

  const accessToken = await fetchToken();
  const searchQueryParams = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const url = `${DRYAD_BASE_API_URL}/datasets?${searchQueryParams.toString()}`;
  const response = await pRetry(
    () =>
      fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    {
      retries: 1,
      onFailedAttempt: (error) => {
        console.warn(
          `Failed to fetch datasets: ${error.message}, retrying once...`,
        );
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch datasets: ${response.status} ${response.statusText}`,
    );
  }

  const rawData = await response.json();
  const zodResult = DatasetResponseSchema.safeParse(rawData);
  if (!zodResult.success) {
    console.warn(`Zod validation failed for ${url}`);
    console.warn(JSON.stringify(rawData, null, 2));
    throw zodResult.error;
  }
  return zodResult.data;
}
