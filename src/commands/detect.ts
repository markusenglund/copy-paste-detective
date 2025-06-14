import { Command } from "@commander-js/extra-typings";
import { runStrategies } from "src/runStrategies";
import { StrategyName } from "src/types/strategies";
import { MetadataSchema } from "src/types/metadata";
import { readFileSync } from "fs";
import path from "path";

function parseIntArgument(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Must be a valid integer, got: ${value}`);
  }
  return parsed;
}

function parseStrategies(value: string): string {
  const allStrategies = Object.values(StrategyName);
  const requestedStrategies = value.split(",").map(s => s.trim());
  const invalidStrategies = requestedStrategies.filter(s => 
    !allStrategies.includes(s as StrategyName)
  );
  
  if (invalidStrategies.length > 0) {
    throw new Error(`Invalid strategies: ${invalidStrategies.join(", ")}. Available: ${allStrategies.join(", ")}`);
  }
  
  return value;
}

const program = new Command();

program.name("detect").description("First command").version("0.1.0");

program
  .command("excel")
  .description("Investigate an excel file")
  .argument("<folder>", "Path to the folder containing metadata.json")
  .argument("[fileIndex]", "Index of the file in the metadata.json files array", parseIntArgument, 0)
  .option(
    "--strategies <strategies>",
    "Comma-separated list of strategies to run",
    parseStrategies,
    Object.values(StrategyName).join(",")
  )
  .action(async (folder, fileIndex, options) => {
    // Read and validate metadata.json
    const metadataPath = path.join(folder, "metadata.json");
    let metadata;

    try {
      const metadataContent = readFileSync(metadataPath, "utf-8");
      const metadataJson = JSON.parse(metadataContent);
      metadata = MetadataSchema.parse(metadataJson);
    } catch (error) {
      console.error("❌ Failed to read or validate metadata.json:", error);
      process.exit(1);
    }

    // Validate file index range
    if (fileIndex < 0 || fileIndex >= metadata.files.length) {
      console.error(
        `❌ Invalid file index: ${fileIndex}. Available files: 0-${metadata.files.length - 1}`
      );
      process.exit(1);
    }

    const selectedFile = metadata.files[fileIndex];
    console.log(`📁 Using folder: ${folder}`);
    console.log(`📄 Selected file: ${selectedFile.name} (index ${fileIndex})`);

    // Parse strategies - validation already done by parseStrategies
    const strategies: StrategyName[] = options.strategies
      .split(",")
      .map((s: string) => s.trim()) as StrategyName[];

    console.log("🔍 Running strategies:", strategies.join(", "));

    await runStrategies(strategies, {
      excelDataFolder: folder,
      excelFileName: selectedFile.name,
      paperName: metadata.name
    });
  });

program.parse();
