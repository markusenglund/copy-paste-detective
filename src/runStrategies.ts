import { Sheet } from "./entities/Sheet";
import {
  StrategyName,
  Strategy,
  StrategyContext,
  StrategyResult
} from "./types/strategies";
import individualNumbersStrategy from "./strategies/individualNumbers/individualNumbers";
import repeatedColumnSequencesStrategy from "./strategies/repeatedColumnSequences/repeatedColumnSequences";
import duplicateRowsStrategy from "./strategies/duplicateRows/duplicateRows";
import xlsx from "xlsx";

const availableStrategies: Record<StrategyName, Strategy<StrategyResult>> = {
  [StrategyName.IndividualNumbers]: individualNumbersStrategy,
  [StrategyName.RepeatedColumnSequences]: repeatedColumnSequencesStrategy,
  [StrategyName.DuplicateRows]: duplicateRowsStrategy
};

export async function runStrategies(
  strategies: StrategyName[],
  context: StrategyContext
): Promise<void> {
  console.log("🔍 Running strategies:", strategies.join(", "));

  console.time("Read Excel file in");
  const workbook = xlsx.readFile(
    `${context.excelDataFolder}/${context.excelFileName}`,
    { sheetRows: 5000 } // Only read the first 5000 rows from each sheet
  );
  console.timeEnd("Read Excel file in");

  const sheetNames = workbook.SheetNames;
  console.log(`Found ${sheetNames.length} sheet(s): ${sheetNames.join(", ")}`);
  const sheets: Sheet[] = sheetNames.map(sheetName => {
    const workbookSheet = workbook.Sheets[sheetName];
    return new Sheet(workbookSheet, sheetName);
  });

  for (const strategyName of strategies) {
    const strategy = availableStrategies[strategyName];

    console.log(`\n🔍 Running ${strategyName} strategy...`);
    const result = await strategy.execute(sheets, context);
    console.log(
      `✅ ${strategyName} completed in ${result.executionTime.toFixed(2)}ms`
    );
    strategy.printResults(result);
  }
}
