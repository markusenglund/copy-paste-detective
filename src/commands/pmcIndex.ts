import { Command } from "@commander-js/extra-typings";
import { logger } from "../utils/logger";
import { closeDb } from "../db";
import { getAllExtPmcIds } from "../repositories/pmcDatasets/pmcDatasetsRepository";
import {
  getLastCursorMark,
  setLastCursorMark,
} from "../repositories/pmcIndexingState/pmcIndexingStateRepository";
import { searchArticles } from "../pmc/searchArticles";
import { indexPmcArticleBatch } from "../pmc/indexPmcArticleBatch";

const program = new Command();

program
  .name("pmc-index")
  .description(
    "Index open-access PubMed Central articles with supplementary files into the database",
  )
  .version("0.1.0")
  .option("--limit <number>", "Maximum number of articles to index", parseInt)
  .action(async (options) => {
    try {
      const alreadyIndexedPmcIds = await getAllExtPmcIds();
      logger.info(`Already indexed: ${alreadyIndexedPmcIds.size} PMC articles`);

      const { cursorMark: savedCursorMark, totalIndexed: savedTotalIndexed } =
        await getLastCursorMark();

      let cursorMark = savedCursorMark ?? "*";
      let totalIndexed = savedTotalIndexed;
      let totalNewlyIndexed = 0;
      let totalNewlyIndexedWithExcel = 0;
      let totalSkippedAlreadyIndexed = 0;
      let totalSkippedNoS3 = 0;
      let totalArticlesProcessed = 0;
      const limit = options.limit ?? Infinity;

      if (savedCursorMark) {
        logger.info(
          `Resuming from cursor: ${savedCursorMark}, previously indexed: ${savedTotalIndexed}`,
        );
      } else {
        logger.info("Starting fresh indexing run");
      }

      while (totalArticlesProcessed < limit) {
        const searchResponse = await searchArticles(cursorMark);
        const extPmcArticles = searchResponse.resultList.result;

        if (extPmcArticles.length === 0) {
          logger.info("No more results from Europe PMC");
          break;
        }

        logger.info(
          `Processing page with ${extPmcArticles.length} articles (total hits: ${searchResponse.hitCount})`,
        );

        const batchResult = await indexPmcArticleBatch(
          extPmcArticles,
          alreadyIndexedPmcIds,
        );

        totalNewlyIndexed += batchResult.indexed;
        totalNewlyIndexedWithExcel += batchResult.indexedWithExcel;
        totalSkippedAlreadyIndexed += batchResult.skippedAlreadyIndexed;
        totalSkippedNoS3 += batchResult.skippedNoS3;
        totalIndexed += batchResult.indexed;
        totalArticlesProcessed += extPmcArticles.length;

        logger.info(
          `Page results: indexed=${batchResult.indexed} (${batchResult.indexedWithExcel} with Excel), skipped_already=${batchResult.skippedAlreadyIndexed}, skipped_no_s3=${batchResult.skippedNoS3}`,
        );
        logger.info(
          `Progress: ${totalNewlyIndexed} indexed this run (${totalArticlesProcessed} articles processed), ${totalIndexed} total`,
        );

        // Check if we've reached the end of pagination
        if (searchResponse.nextCursorMark === cursorMark) {
          logger.info("Reached end of Europe PMC results");
          break;
        }

        cursorMark = searchResponse.nextCursorMark;
        await setLastCursorMark(cursorMark, totalIndexed);
      }

      logger.info(
        `Finished: ${totalNewlyIndexed} indexed this run (${totalNewlyIndexedWithExcel} with Excel), ${totalSkippedAlreadyIndexed} skipped (already indexed), ${totalSkippedNoS3} skipped (no S3 metadata), ${totalArticlesProcessed} articles processed, ${totalIndexed} total indexed`,
      );
    } catch (error) {
      logger.error(error, "PMC indexing failed");
      process.exit(1);
    } finally {
      await closeDb();
    }
  });

program.parse();
