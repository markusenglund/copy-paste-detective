import { Command } from "@commander-js/extra-typings";
import { analyzeDataset } from "../detection/analyzeDataset";
import { StrategyName } from "../types/strategies";
import { ExcelFileData } from "../types/ExcelFileData";
import { loadExcelFileFromFolder } from "../utils/loadExcelFileFromFolder";
import { parseIntArgument, parseStrategies } from "../utils/command";
import { logger } from "../utils/logger";

const program = new Command();

program.name("detect").description("First command").version("0.1.0");

program
  .command("excel")
  .description("Investigate an excel file")
  .argument("<folder>", "Path to the folder containing metadata.json")
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
  .action(async (folder, fileIndex, options) => {
    const startTime = Date.now();

    let excelFileData: ExcelFileData;
    try {
      excelFileData = loadExcelFileFromFolder(folder, fileIndex);
    } catch (error) {
      logger.error("❌ Failed to load Excel file from folder:", error);
      process.exit(1);
    }

    logger.info(
      `📄 Selected file '${excelFileData.excelFileName}' (index ${fileIndex}) from folder: '${folder}'`,
    );

    await analyzeDataset([excelFileData], options.strategies);
    logger.info(`Total execution time: ${Date.now() - startTime}ms`);
  });

program.parse();
