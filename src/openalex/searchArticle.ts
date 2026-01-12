import { config } from "../config/env";
import { logger } from "../utils/logger";
import {
  Work,
  WorkSchema,
  WorkSearchResult,
  WorkSearchResultsSchema,
} from "./schemas";

export async function getArticleByTitle(
  title: string,
): Promise<WorkSearchResult | undefined> {
  const apiUrlBase = "https://api.openalex.org";
  // Strip title of commas (which are not supported by the OpenAlex API)
  const words = title.match(/[^,\s]+/g) || [];
  const strippedTitle = words.join(" ");
  const searchQueryParams = new URLSearchParams({
    filter: `title.search:${strippedTitle},type:article`,
    per_page: "1",
    mailto: config.openAlexEmailAddress,
  });

  const url = `${apiUrlBase}/works?${searchQueryParams.toString()}`;
  logger.debug(`Request to '${url}'`);
  const response = await fetch(url);
  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to search article: ${response.status} ${response.statusText} - ${responseText}`,
    );
  }
  const data = await response.json();
  const zodResult = WorkSearchResultsSchema.safeParse(data);
  if (!zodResult.success) {
    throw new Error(`Zod validation failed for ${url}: ${zodResult.error}`);
  }
  const validated = zodResult.data;
  return validated.results[0];
}

export async function getArticleByDoi(doi: string): Promise<Work> {
  const apiUrlBase = "https://api.openalex.org";
  const searchQueryParams = new URLSearchParams({
    mailto: config.openAlexEmailAddress,
  });
  const url = `${apiUrlBase}/works/${doi}?${searchQueryParams.toString()}`;
  logger.debug(`Request to '${url}'`);
  const response = await fetch(url);
  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to search article: ${response.status} ${response.statusText} - ${responseText}`,
    );
  }
  const data = await response.json();
  const zodResult = WorkSchema.safeParse(data);
  if (!zodResult.success) {
    throw new Error(`Zod validation failed for ${url}: ${zodResult.error}`);
  }
  const validated = zodResult.data;
  return validated;
}
