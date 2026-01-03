import { Command } from "@commander-js/extra-typings";
import { db as analysisResultsDb } from "../dryad/analysisResultsDb";
import { getDatasetsByDownloadStatusWithFiles } from "../repositories/datasets/datasetsRepository";

const program = new Command();

program
  .name("dryad-mark-as-evaluated")
  .description(
    "List all analyzed datasets. Note: With the new schema, evaluation status is tracked in analysisResultsDb.",
  )
  .action(async () => {
    // Get all completed (downloaded) datasets
    const completedDatasets =
      await getDatasetsByDownloadStatusWithFiles("completed", 10000);
    const completedExtIds = new Set(completedDatasets.map((d) => d.extId));

    // Get all analyzed dataset IDs from analysisResultsDb
    const analyzedExtIds = Object.keys(analysisResultsDb.data.results)
      .map(Number)
      .filter((extId) => completedExtIds.has(extId));

    if (analyzedExtIds.length === 0) {
      console.log("No analyzed datasets found.");
      return;
    }

    console.log(`Found ${analyzedExtIds.length} analyzed datasets.`);
    console.log(
      "Note: With the new database schema, download status and analysis status are tracked separately.",
    );
    console.log(
      "Downloaded datasets are tracked in PostgreSQL, analysis results in analysisResultsDb.",
    );
    console.log("\nAnalyzed dataset IDs:", analyzedExtIds.join(", "));
  });

program.parse();
