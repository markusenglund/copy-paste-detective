import { Command } from "@commander-js/extra-typings";
import { db as datasetDb } from "../dryad/datasetsDb";
import { db as analysisResultsDb } from "../dryad/analysisResultsDb";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { StrategyName } from "../types/strategies";
import { runStrategies } from "../runStrategies";
import { parseIntArgument, parseStrategies } from "../utils/command";

const program = new Command();

program
  .name("dryad-detect")
  .description("Analyze an excel file from a downloaded Dryad dataset.")
  .argument("<datasetExtId>", "Dryad dataset external ID", parseIntArgument)
  .argument(
    "[fileIndex]",
    "Index of the file in the metadata.json files array",
    parseIntArgument,
    0,
  )
  .option(
    "--strategies <strategies>",
    "Comma-separated list of strategies to run",
    parseStrategies,
    Object.values(StrategyName),
  )
  .action(async (datasetExtId, fileIndex, options) => {
    const dataset = datasetDb.data.datasets.find(
      (dataset) => dataset.extId === datasetExtId,
    );
    if (!dataset) {
      console.error(
        `Dataset with extId ${datasetExtId} not found in the database.`,
      );
      process.exit(1);
    }
    if (dataset.status !== "downloaded" && dataset.status !== "analyzed") {
      console.error(`Dataset with extId ${datasetExtId} is not downloaded.`);
      process.exit(1);
    }

    const excelFile = dataset.excelFiles[fileIndex];
    if (excelFile.status !== "downloaded") {
      console.error(
        `Excel file at index ${fileIndex} is not downloaded. Status: ${excelFile.status}`,
      );
      process.exit(1);
    }
    console.log(
      `Analyzing ${excelFile.filename} from dataset ${dataset.extId} from ${dataset.dryadPublicationDate} (${excelFile.size} bytes) - "${dataset.title}"`,
    );
    analysisResultsDb.data.results[dataset.extId] = {};
    const excelFileData = loadExcelFileFromDryadIndex(dataset, fileIndex);

    await runStrategies(options.strategies, excelFileData);
  });

program.parse();
