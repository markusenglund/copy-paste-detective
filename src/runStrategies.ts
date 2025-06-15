import { Sheet } from "./entities/Sheet";
import {
  StrategyName,
  StrategyContext,
  StrategyDependencies
} from "./types/strategies";
import individualNumbersStrategy from "./strategies/individualNumbers/individualNumbers";
import repeatedColumnSequencesStrategy from "./strategies/repeatedColumnSequences/repeatedColumnSequences";
import duplicateRowsStrategy from "./strategies/duplicateRows/duplicateRows";
import xlsx from "xlsx";


export async function runStrategies(
  strategies: StrategyName[],
  context: StrategyContext,
  dependencies?: StrategyDependencies
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

  let duplicateRowsResult;

  // 1. Run duplicateRows first if requested
  if (strategies.includes(StrategyName.DuplicateRows)) {
    console.log(`\n🔍 Running ${StrategyName.DuplicateRows} strategy...`);
    duplicateRowsResult = await duplicateRowsStrategy.execute(sheets, context, dependencies);
    console.log(
      `✅ ${StrategyName.DuplicateRows} completed in ${duplicateRowsResult.executionTime.toFixed(2)}ms`
    );
    duplicateRowsStrategy.printResults(duplicateRowsResult);
  }

  // 2. Run repeatedColumnSequences second if requested
  if (strategies.includes(StrategyName.RepeatedColumnSequences)) {
    console.log(`\n🔍 Running ${StrategyName.RepeatedColumnSequences} strategy...`);
    const result = await repeatedColumnSequencesStrategy.execute(sheets, context, dependencies);
    console.log(
      `✅ ${StrategyName.RepeatedColumnSequences} completed in ${result.executionTime.toFixed(2)}ms`
    );
    repeatedColumnSequencesStrategy.printResults(result);
  }

  // 3. Run individualNumbers last if requested, with duplicate rows results
  if (strategies.includes(StrategyName.IndividualNumbers)) {
    console.log(`\n🔍 Running ${StrategyName.IndividualNumbers} strategy...`);
    const individualNumbersDependencies = {
      ...dependencies,
      previousResults: duplicateRowsResult ? [duplicateRowsResult] : []
    };
    const result = await individualNumbersStrategy.execute(sheets, context, individualNumbersDependencies);
    console.log(
      `✅ ${StrategyName.IndividualNumbers} completed in ${result.executionTime.toFixed(2)}ms`
    );
    individualNumbersStrategy.printResults(result);
  }
}
