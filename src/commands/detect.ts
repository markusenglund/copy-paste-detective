import { Command } from "@commander-js/extra-typings";
import { runStrategies } from "../runStrategies";
import { StrategyName } from "../types/strategies";
import { loadExcelFileFromFolder } from "../utils/loadExcelFileFromFolder";

function parseIntArgument(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Must be a valid integer, got: ${value}`);
  }
  return parsed;
}

function parseStrategies(value: string): string {
  const allStrategies = Object.values(StrategyName);
  const requestedStrategies = value.split(",").map((s) => s.trim());
  const invalidStrategies = requestedStrategies.filter(
    (s) => !allStrategies.includes(s as StrategyName),
  );

  if (invalidStrategies.length > 0) {
    throw new Error(
      `Invalid strategies: ${invalidStrategies.join(", ")}. Available: ${allStrategies.join(", ")}`,
    );
  }

  return value;
}

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
    Object.values(StrategyName).join(","),
  )
  .action(async (folder, fileIndex, options) => {
    console.time("Total execution time");

    let excelFileData;
    try {
      excelFileData = loadExcelFileFromFolder(folder, fileIndex);
      excelFileData.sheets = excelFileData.sheets.slice(2, 3);
    } catch (error) {
      console.error("❌ Failed to load Excel file from folder:", error);
      process.exit(1);
    }

    console.log(
      `📄 Selected file '${excelFileData.excelFileName}' (index ${fileIndex}) from folder: '${folder}'`,
    );

    const strategies: StrategyName[] = options.strategies
      .split(",")
      .map((s: string) => s.trim()) as StrategyName[];

    await runStrategies(strategies, excelFileData);
    console.timeEnd("Total execution time");
  });

program.parse();
