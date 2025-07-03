import { fetchToken } from "./fetchToken";
import { FilesResponseSchema, type FilesResponse } from "./schemas";
import pRetry from "p-retry";

const DRYAD_BASE_API_URL = "https://datadryad.org/api/v2";
type Params = {
  version: number;
};
export async function listFiles({ version }: Params): Promise<FilesResponse> {
  const accessToken = await fetchToken();

  const url = `${DRYAD_BASE_API_URL}/versions/${version}/files`;
  const responseData = await pRetry(
    async (): Promise<unknown> => {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch file list: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      return data;
    },
    {
      retries: 1,
      onFailedAttempt: (error) => {
        console.warn(`${error.message}, retrying once...`);
      },
    },
  );

  const zodResult = FilesResponseSchema.safeParse(responseData);
  if (!zodResult.success) {
    throw new Error(`Zod validation failed for ${url}: ${zodResult.error}`);
  }
  return zodResult.data;
}
