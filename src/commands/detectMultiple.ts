import { Command } from "@commander-js/extra-typings";
import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../utils/logger";
import { loadExcelFileWithoutMetadata } from "../utils/loadExcelFileWithoutMetadata";
import { analyzeDataset } from "../detection/analyzeDataset";
import { StrategyName } from "../types/strategies";
import { parseStrategies } from "../utils/command";

const program = new Command();

program
  .name("detect-multiple")
  .description(
    "Run the detection algorithm on all Excel sheets in a folder without any metadata",
  )
  .argument("<folder>", "Path to the folder containing Excel files")
  .option(
    "--strategies <strategies>",
    "Comma-separated list of strategies to run",
    parseStrategies,
    Object.values(StrategyName),
  )
  .action(async (folder, options) => {
    const startTime = Date.now();

    // Get all Excel files in the folder
    const files = await fs.readdir(folder);
    const excelFiles = files.filter(
      (file) => file.endsWith(".xlsx") || file.endsWith(".xls"),
    );

    if (excelFiles.length === 0) {
      logger.error(`No Excel files found in folder '${folder}'`);
      process.exit(1);
    }

    logger.info(`Found ${excelFiles.length} Excel files in folder '${folder}'`);

    // Process each file individually
    for (let i = 0; i < excelFiles.length; i++) {
      const fileName = excelFiles[i];
      const filePath = path.join(folder, fileName);

      logger.info(
        `\n${"=".repeat(80)}\nAnalyzing file ${i + 1}/${excelFiles.length}: '${fileName}'\n${"=".repeat(80)}`,
      );

      try {
        const excelFileData = loadExcelFileWithoutMetadata(filePath);

        await analyzeDataset([excelFileData], options.strategies, {
          excludeAiProfile: true,
          skipResultsReview: true,
        });
      } catch (error) {
        logger.error(`Failed to analyze file '${fileName}': ${error}`);
        // Continue with next file
      }
    }

    logger.info(
      `\n${"=".repeat(80)}\nCompleted analysis of ${excelFiles.length} files\nTotal execution time: ${Date.now() - startTime}ms`,
    );
  });

program.parse();
