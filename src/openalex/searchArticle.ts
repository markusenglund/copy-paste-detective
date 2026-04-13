import { config } from "../config/env";
import { logger } from "../utils/logger";
import {
  Work,
  WorkSchema,
  WorkSearchResult,
  WorkSearchResultsSchema,
} from "./schemas";
import striptags from "striptags";

const apiUrlBase = "https://api.openalex.org";

export async function getArticleByTitle(
  title: string,
): Promise<WorkSearchResult | undefined> {
  // Strip title of commas (which are not supported by the OpenAlex API)
  const words = title.match(/[^,\s]+/g);
  if (!words) {
    return undefined;
  }
  const strippedTitle = words.join(" ");
  const searchQueryParams = new URLSearchParams({
    filter: `title.search:${strippedTitle},type:article`,
    per_page: "1",
    api_key: config.openAlexApiKey,
  });

  const url = `${apiUrlBase}/works?${searchQueryParams.toString()}`;
  const safeParams = new URLSearchParams(searchQueryParams);
  safeParams.delete("api_key");
  const safeUrl = `${apiUrlBase}/works?${safeParams.toString()}`;
  logger.debug(`Request to '${safeUrl}'`);
  const response = await fetch(url);
  if (!response.ok) {
    const responseText = await response.text();
    if (response.status === 500) {
      logger.error(
        `Failed to search article at '${safeUrl}' - ${response.status} ${response.statusText} - ${responseText}`,
      );
      return undefined;
    }
    throw new Error(
      `Failed to search article at '${safeUrl}' - ${response.status} ${response.statusText} - ${responseText}`,
    );
  }
  const data = await response.json();
  const zodResult = WorkSearchResultsSchema.safeParse(data);
  if (!zodResult.success) {
    throw new Error(
      `Zod validation failed for ${safeUrl} - ${zodResult.error}`,
    );
  }
  const validated = zodResult.data;
  return validated.results[0];
}

export async function getArticleByAbstract(
  abstract: string,
): Promise<WorkSearchResult | undefined> {
  const cleanAbstract = striptags(abstract);
  const firstWords = cleanAbstract.match(/[^,\s]+/g)?.slice(0, 15);
  if (!firstWords) {
    return undefined;
  }
  const abstractSearchString = firstWords.join(" ");
  const searchQueryParams = new URLSearchParams({
    filter: `abstract.search:"${abstractSearchString}",type:article`,
    per_page: "1",
    api_key: config.openAlexApiKey,
  });
  const url = `${apiUrlBase}/works?${searchQueryParams.toString()}`;
  const safeParams = new URLSearchParams(searchQueryParams);
  safeParams.delete("api_key");
  const safeUrl = `${apiUrlBase}/works?${safeParams.toString()}`;
  logger.debug(`Request to '${safeUrl}'`);
  const response = await fetch(url);
  if (!response.ok) {
    const responseText = await response.text();
    if (response.status === 500) {
      logger.error(
        `Failed to search article at '${safeUrl}' - ${response.status} ${response.statusText} - ${responseText}`,
      );
      return undefined;
    }
    throw new Error(
      `Failed to search article at '${safeUrl}' - ${response.status} ${response.statusText} - ${responseText}`,
    );
  }
  const data = await response.json();
  const zodResult = WorkSearchResultsSchema.safeParse(data);
  if (!zodResult.success) {
    throw new Error(
      `Zod validation failed for ${safeUrl} - ${zodResult.error}`,
    );
  }
  const validated = zodResult.data;
  return validated.results[0];
}

export async function getArticleByDoi(doi: string): Promise<Work | undefined> {
  const apiUrlBase = "https://api.openalex.org";
  const searchQueryParams = new URLSearchParams({
    api_key: config.openAlexApiKey,
  });
  const url = `${apiUrlBase}/works/${doi}?${searchQueryParams.toString()}`;
  const safeUrl = `${apiUrlBase}/works/${doi}`;
  logger.debug(`Request to '${safeUrl}'`);
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) {
      return undefined;
    }
    const responseText = await response.text();
    if (response.status === 500) {
      logger.error(
        `Failed to get article by DOI '${doi}' at '${safeUrl}': ${response.status} ${response.statusText} - ${responseText}`,
      );
      return undefined;
    }
    throw new Error(
      `Failed to get article by DOI '${doi}' at '${safeUrl}': ${response.status} ${response.statusText} - ${responseText}`,
    );
  }
  const data = await response.json();
  const zodResult = WorkSchema.safeParse(data);
  if (!zodResult.success) {
    throw new Error(
      `Zod validation failed for ${safeUrl} - ${zodResult.error}`,
    );
  }
  const validated = zodResult.data;
  return validated;
}
