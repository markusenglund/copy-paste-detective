import { Command } from "@commander-js/extra-typings";
import { getDatasetWithFiles } from "../dryad/datasetsDb";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { StrategyName } from "../types/strategies";
import { parseIntArgument, parseStrategies } from "../utils/command";
import { maxExcelFilesPerDataset } from "../config/config";
import { analyzeDataset } from "../detection/analyzeDataset";
import { ExcelFileData } from "../types/ExcelFileData";

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
    const dataset = await getDatasetWithFiles(datasetExtId);
    if (!dataset) {
      console.error(
        `Dataset with extId ${datasetExtId} not found in the database.`,
      );
      process.exit(1);
    }
    if (dataset.downloadStatus !== "completed") {
      console.error(
        `Dataset with extId ${datasetExtId} is not downloaded. Status: ${dataset.downloadStatus}`,
      );
      process.exit(1);
    }

    // If fileIndex is not provided, analyze all Excel files in the dataset.
    const dryadExcelFiles =
      fileIndex === undefined
        ? dataset.excelFiles
        : [dataset.excelFiles[fileIndex]];

    const downloadedExcelFiles: ExcelFileData[] = [];
    for (
      let i = 0;
      i < Math.min(dryadExcelFiles.length, maxExcelFilesPerDataset);
      i++
    ) {
      const dryadExcelFile = dryadExcelFiles[i];
      if (dryadExcelFile.downloadStatus !== "completed") {
        console.error(
          `Excel file at index ${i} is not downloaded. Status: ${dryadExcelFile.downloadStatus}`,
        );
        continue;
      }
      console.log(
        `Analyzing ${dryadExcelFile.filename} from dataset ${dataset.extId} from ${dataset.dryadPublicationDate} (${dryadExcelFile.size} bytes) - "${dataset.title}"`,
      );
      const excelFileData = loadExcelFileFromDryadIndex(dataset, i);
      downloadedExcelFiles.push(excelFileData);
    }
    await analyzeDataset(downloadedExcelFiles, options.strategies);
  });

program.parse();
