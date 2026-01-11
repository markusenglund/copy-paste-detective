import { config } from "../config/env";
import { logger } from "../utils/logger";

export async function getArticleByTitle(title: string): Promise<unknown> {
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
  return data.results[0];
}

export async function getArticleByDoi(doi: string): Promise<unknown> {
  const apiUrlBase = "https://api.openalex.org";
  const url = `${apiUrlBase}/works/${doi}`;
  logger.debug(`Request to '${url}'`);
  const response = await fetch(url);
  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to search article: ${response.status} ${response.statusText} - ${responseText}`,
    );
  }
  const data = await response.json();
  return data;
}
