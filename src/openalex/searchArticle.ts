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
  logger.debug(`Request to '${url}'`);
  const response = await fetch(url);
  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to search article at '${url}': ${response.status} ${response.statusText} - ${responseText}`,
    );
  }
  const data = await response.json();
  const zodResult = WorkSearchResultsSchema.safeParse(data);
  if (!zodResult.success) {
    throw new Error(`Zod validation failed for ${url} - ${zodResult.error}`);
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
  logger.debug(`Request to '${url}'`);
  const response = await fetch(url);
  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to search article at '${url}': ${response.status} ${response.statusText} - ${responseText}`,
    );
  }
  const data = await response.json();
  const zodResult = WorkSearchResultsSchema.safeParse(data);
  if (!zodResult.success) {
    throw new Error(`Zod validation failed for ${url} - ${zodResult.error}`);
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
  logger.debug(`Request to '${url}'`);
  const response = await fetch(url);
  if (!response.ok) {
    const responseText = await response.text();
    logger.warn(
      `Failed to get article by DOI '${doi}' at '${url}': ${response.status} ${response.statusText} - ${responseText}`,
    );
    return undefined;
  }
  const data = await response.json();
  const zodResult = WorkSchema.safeParse(data);
  if (!zodResult.success) {
    throw new Error(`Zod validation failed for ${url} - ${zodResult.error}`);
  }
  const validated = zodResult.data;
  return validated;
}
