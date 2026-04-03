import { Command } from "@commander-js/extra-typings";
import { logger } from "../utils/logger";
import { SearchResponseSchema } from "../pmc/schemas";

const EUROPE_PMC_SEARCH_URL =
  "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

const program = new Command();

program
  .name("pmc-index")
  .description(
    "Search Europe PMC for open access articles with supplementary files",
  )
  .version("0.1.0")
  .action(async () => {
    try {
      const params = new URLSearchParams({
        query: "HAS_SUPPL:y OPEN_ACCESS:y",
        format: "json",
        pageSize: "25",
        sort: "CITED desc",
        cursorMark: "*",
      });

      const url = `${EUROPE_PMC_SEARCH_URL}?${params.toString()}`;
      logger.info(`Fetching: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Europe PMC API error: ${response.status} ${response.statusText}`,
        );
      }

      const json = await response.json();
      const data = SearchResponseSchema.parse(json);

      logger.info(`Total results: ${data.hitCount}`);
      logger.info(`Results in this page: ${data.resultList.result.length}`);
      logger.info(`Next cursor: ${data.nextCursorMark}`);

      for (const article of data.resultList.result) {
        console.log(article);
      }
    } catch (error) {
      logger.error(error, "Failed to search Europe PMC");
      process.exit(1);
    }
  });

program.parse();
