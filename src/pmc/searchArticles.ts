import { europePmcFetch } from "./pmcFetch";
import { SearchResponse, SearchResponseSchema } from "./schemas";
import { logger } from "../utils/logger";

const EUROPE_PMC_SEARCH_URL =
  "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

export async function searchArticles(
  cursorMark: string,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    query: "HAS_SUPPL:y OPEN_ACCESS:y",
    format: "json",
    pageSize: "100",
    sort: "CITED desc",
    resultType: "core",
    cursorMark,
  });

  const url = `${EUROPE_PMC_SEARCH_URL}?${params.toString()}`;
  logger.info(`Fetching Europe PMC page ${url}`);

  const response = await europePmcFetch(url);

  if (!response.ok) {
    throw new Error(
      `Europe PMC API error: ${response.status} ${response.statusText}`,
    );
  }

  const json = await response.json();
  const result = SearchResponseSchema.safeParse(json);
  if (!result.success) {
    logger.info(`Europe PMC API response validation failed, URL: ${url}`);
    throw new Error(`Europe PMC API error: ${result.error.message}`);
  }
  return result.data;
}
