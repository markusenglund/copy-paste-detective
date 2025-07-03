import { fetchToken } from "./fetchToken";
import { FilesResponseSchema, type FilesResponse } from "./schemas";
import pRetry from "p-retry";

const DRYAD_BASE_API_URL = "https://datadryad.org/api/v2";
type Params = {
  version: number;
};

type ErrorResponse = {
  error: {
    message: string;
    status: number;
  };
};

export async function listFiles({
  version,
}: Params): Promise<FilesResponse | ErrorResponse> {
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
        console.warn(
          `Failed to fetch file list at ${url} - ${response.status} ${response.statusText}`,
        );
        if (response.status === 404) {
          return {
            error: {
              message: response.statusText,
              status: response.status,
            },
          };
        }
        throw new Error(`${response.status} ${response.statusText}`);
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

  if (
    typeof responseData === "object" &&
    responseData !== null &&
    "error" in responseData
  ) {
    return responseData as ErrorResponse;
  }

  const zodResult = FilesResponseSchema.safeParse(responseData);
  if (!zodResult.success) {
    throw new Error(`Zod validation failed for ${url}: ${zodResult.error}`);
  }
  return zodResult.data;
}
