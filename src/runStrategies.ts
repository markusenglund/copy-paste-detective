import { Sheet } from "src/entities/Sheet";
import {
  StrategyName,
  Strategy,
  StrategyContext,
  StrategyResult
} from "src/types/strategies";
import individualNumbersStrategy from "src/strategies/individualNumbers/individualNumbers";
import repeatedColumnSequencesStrategy from "src/strategies/repeatedColumnSequences/repeatedColumnSequences";
import duplicateRowsStrategy from "src/strategies/duplicateRows/duplicateRows";
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
  console.time("Time elapsed");
  console.time("Read Excel file in");

  const excelDataFolder = context.excelDataFolder;
  const excelFileName = context.excelFileName;

  const workbook = xlsx.readFile(
    `${excelDataFolder}/${excelFileName}`,
    { sheetRows: 5000 } // Only read the first 5000 rows from each sheet
  );
  console.timeEnd("Read Excel file in");

  const sheetNames = workbook.SheetNames;
  console.log(`Found ${sheetNames.length} sheets: ${sheetNames.join(", ")}`);

  const sheets: Sheet[] = sheetNames.map(sheetName => {
    const workbookSheet = workbook.Sheets[sheetName];
    return new Sheet(workbookSheet, sheetName);
  });

  for (const strategyName of strategies) {
    const strategy = availableStrategies[strategyName];
    if (!strategy) {
      console.warn(`⚠️ Unknown strategy: ${strategyName}`);
      continue;
    }

    console.log(`\n🔍 Running ${strategyName} strategy...`);
    const result = await strategy.execute(sheets, context);
    console.log(
      `✅ ${strategyName} completed in ${result.executionTime.toFixed(2)}ms`
    );
    strategy.printResults(result);
  }

  console.timeEnd("Time elapsed");
}
