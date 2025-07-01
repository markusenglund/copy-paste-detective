import { fetchToken } from "./fetchToken";
import { FilesResponseSchema, type FilesResponse } from "./schemas";

const DRYAD_BASE_API_URL = "https://datadryad.org/api/v2";
type Params = {
  version: number;
};
export async function listFiles({ version }: Params): Promise<FilesResponse> {
  const accessToken = await fetchToken();

  const url = `${DRYAD_BASE_API_URL}/versions/${version}/files`;
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
  const validatedData = FilesResponseSchema.parse(rawData);

  return validatedData;
}
