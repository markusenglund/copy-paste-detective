import { Command } from "@commander-js/extra-typings";
import { db as datasetDb } from "../dryad/datasetsDb";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { StrategyName } from "../types/strategies";
import { runStrategies } from "../runStrategies";
import { parseIntArgument, parseStrategies } from "../utils/command";
import { maxExcelFilesPerDataset } from "../config/config";

const program = new Command();

program
  .name("dryad-detect")
  .description("Analyze an excel file from a downloaded Dryad dataset.")
  .argument("<datasetExtId>", "Dryad dataset external ID", parseIntArgument)
  .argument(
    "[fileIndex]",
    "Index of the file in the excelFiles array of the dataset",
    parseIntArgument,
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
    if (!["downloaded", "analyzed", "evaluated"].includes(dataset.status)) {
      console.error(`Dataset with extId ${datasetExtId} is not downloaded.`);
      process.exit(1);
    }

    // If fileIndex is not provided, analyze all Excel files in the dataset.
    const excelFiles =
      fileIndex === undefined
        ? dataset.excelFiles
        : [dataset.excelFiles[fileIndex]];

    for (
      let i = 0;
      i < Math.min(excelFiles.length, maxExcelFilesPerDataset);
      i++
    ) {
      const excelFile = excelFiles[i];
      if (excelFile.status !== "downloaded") {
        console.error(
          `Excel file at index ${i} is not downloaded. Status: ${excelFile.status}`,
        );
        continue;
      }
      console.log(
        `Analyzing ${excelFile.filename} from dataset ${dataset.extId} from ${dataset.dryadPublicationDate} (${excelFile.size} bytes) - "${dataset.title}"`,
      );
      const excelFileData = loadExcelFileFromDryadIndex(dataset, i);
      await runStrategies(options.strategies, excelFileData);
    }
  });

program.parse();
