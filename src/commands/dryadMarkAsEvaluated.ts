import { Command } from "@commander-js/extra-typings";
import { db as analysisResultsDb } from "../dryad/analysisResultsDb";
import { getDatasetsByDownloadStatusWithFiles } from "../repositories/datasets/datasetsRepository";
import { logger } from "../utils/logger";

const program = new Command();

program
  .name("dryad-mark-as-evaluated")
  .description(
    "List all analyzed datasets. Note: With the new schema, evaluation status is tracked in analysisResultsDb.",
  )
  .action(async () => {
    // Get all completed (downloaded) datasets
    const completedDatasets = await getDatasetsByDownloadStatusWithFiles(
      "completed",
      10000,
    );
    const completedExtIds = new Set(completedDatasets.map((d) => d.extId));

    // Get all analyzed dataset IDs from analysisResultsDb
    const analyzedExtIds = Object.keys(analysisResultsDb.data.results)
      .map(Number)
      .filter((extId) => completedExtIds.has(extId));

    if (analyzedExtIds.length === 0) {
      logger.info("No analyzed datasets found.");
      return;
    }

    logger.info(`Found ${analyzedExtIds.length} analyzed datasets.`);
    logger.info(
      "Note: With the new database schema, download status and analysis status are tracked separately.",
    );
    logger.info(
      "Downloaded datasets are tracked in PostgreSQL, analysis results in analysisResultsDb.",
    );
    logger.info(`\nAnalyzed dataset IDs: ${analyzedExtIds.join(", ")}`);
  });

program.parse();
