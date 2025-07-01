import { URLSearchParams } from "node:url";
import { DatasetResponseSchema, type DatasetResponse } from "./schemas";

const DRYAD_BASE_API_URL = "https://datadryad.org/api/v2";
type Params = {
  page: number;
  perPage: number;
};
export async function listDatasets({
  page,
  perPage,
}: Params): Promise<DatasetResponse> {
  const searchQueryParams = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const url = `${DRYAD_BASE_API_URL}/datasets?${searchQueryParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch datasets: ${response.status} ${response.statusText}`,
    );
  }

  const rawData = await response.json();
  const validatedData = DatasetResponseSchema.parse(rawData);

  return validatedData;
}
