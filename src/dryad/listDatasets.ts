import { URLSearchParams } from "node:url";
import { DatasetResponseSchema, type DatasetResponse } from "./schemas";
import { fetchToken } from "./fetchToken";

const DRYAD_BASE_API_URL = "https://datadryad.org/api/v2";
type Params = {
  page: number;
  perPage: number;
};
export async function listDatasets({
  page,
  perPage,
}: Params): Promise<DatasetResponse> {
  const accessToken = await fetchToken();
  const searchQueryParams = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const url = `${DRYAD_BASE_API_URL}/datasets?${searchQueryParams.toString()}`;
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

  const rawData = await response.json();
  const zodResult = DatasetResponseSchema.safeParse(rawData);
  if (!zodResult.success) {
    console.warn(`Zod validation failed for ${url}`);
    console.warn(JSON.stringify(rawData, null, 2));
    throw zodResult.error;
  }
  return zodResult.data;
}
