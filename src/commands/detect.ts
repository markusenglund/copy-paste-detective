import { Command } from "@commander-js/extra-typings";
import { runStrategies } from "../runStrategies";
import { StrategyName } from "../types/strategies";
import { ExcelFileData } from "../types/ExcelFileData";
import { loadExcelFileFromFolder } from "../utils/loadExcelFileFromFolder";
import { parseIntArgument, parseStrategies } from "../utils/command";

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
    console.time("Total execution time");

    let excelFileData: ExcelFileData;
    try {
      excelFileData = await loadExcelFileFromFolder(folder, fileIndex);
    } catch (error) {
      console.error("❌ Failed to load Excel file from folder:", error);
      process.exit(1);
    }

    console.log(
      `📄 Selected file '${excelFileData.excelFileName}' (index ${fileIndex}) from folder: '${folder}'`,
    );

    await runStrategies(options.strategies, excelFileData);
    console.timeEnd("Total execution time");
  });

program.parse();
