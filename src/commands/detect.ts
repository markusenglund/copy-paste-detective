import { Command } from "@commander-js/extra-typings";
import { analyzeDataset } from "../detection/analyzeDataset";
import { StrategyName } from "../types/strategies";
import { ExcelFileData } from "../types/ExcelFileData";
import { loadExcelFileWithoutMetadata } from "../utils/loadExcelFileWithoutMetadata";
import { parseColumns, parseStrategies } from "../utils/command";
import { logger } from "../utils/logger";

const program = new Command();

program.name("detect").description("First command").version("0.1.0");

program
  .command("excel")
  .description("Investigate an excel file")
  .argument("<file>", "Path to the Excel file")
  .option(
    "--strategies <strategies>",
    "Comma-separated list of strategies to run",
    parseStrategies,
    Object.values(StrategyName),
  )
  .option(
    "--columns <columns>",
    "Comma-separated list of column names to include in analysis",
    parseColumns,
  )
  .action(async (file, options) => {
    const startTime = Date.now();

    let excelFileData: ExcelFileData;
    try {
      excelFileData = loadExcelFileWithoutMetadata(file);
    } catch (error) {
      logger.error(`Failed to load Excel file: ${error}`);
      process.exit(1);
    }

    logger.info(`Analyzing file '${excelFileData.excelFileName}'`);

    await analyzeDataset([excelFileData], options.strategies, {
      excludeAiProfile: true,
      skipResultsReview: true,
      includedColumns: options.columns,
    });
    logger.info(`Total execution time: ${Date.now() - startTime}ms`);
  });

program.parse();
