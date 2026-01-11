import { config } from "../config/env";
import { logger } from "../utils/logger";

export async function searchArticle(datasetTitle: string): Promise<unknown> {
  const titlePrefixesToRemove = [
    "Data from: ",
    "Dataset for: ",
    "Dataset from: ",
    "Data and code from: ",
    "Data for the paper ",
    "Raw data accompanying: ",
    "Raw data for ",
    "Data for ",
    "Dataset: ",
    "Supporting data: ",
  ];

  let articleTitleBestGuess = datasetTitle;
  for (const prefix of titlePrefixesToRemove) {
    if (articleTitleBestGuess.startsWith(prefix)) {
      articleTitleBestGuess = articleTitleBestGuess.slice(prefix.length);
      break;
    }
  }

  const apiUrlBase = "https://api.openalex.org";
  // Extract all words (everything except commas and spaces) and join with spaces
  const words = articleTitleBestGuess.match(/[^,\s]+/g) || [];
  const strippedTitle = words.join(" ");
  const searchQueryParams = new URLSearchParams({
    filter: `title.search:${strippedTitle}`,
    "per-page": "1",
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
  return data;
}
