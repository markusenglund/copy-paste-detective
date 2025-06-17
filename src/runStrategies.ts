import { StrategyName, StrategyDependencies } from "./types/strategies";
import individualNumbersStrategy from "./strategies/individualNumbers/individualNumbers";
import repeatedColumnSequencesStrategy from "./strategies/repeatedColumnSequences/repeatedColumnSequences";
import duplicateRowsStrategy from "./strategies/duplicateRows/duplicateRows";
import { ExcelFileData } from "./types/ExcelFileData";

export async function runStrategies(
  strategies: StrategyName[],
  excelFileData: ExcelFileData,
  dependencies?: StrategyDependencies,
): Promise<void> {
  console.log("🔍 Running strategies:", strategies.join(", "));

  const { sheets } = excelFileData;
  console.log(
    `Found ${sheets.length} sheet(s): ${sheets.map((s) => s.name).join(", ")}`,
  );

  let duplicateRowsResult;

  // 1. Run duplicateRows first if requested
  if (strategies.includes(StrategyName.DuplicateRows)) {
    console.log(`\n🔍 Running ${StrategyName.DuplicateRows} strategy...`);
    duplicateRowsResult = await duplicateRowsStrategy.execute(
      excelFileData,
      dependencies,
    );
    console.log(
      `✅ ${StrategyName.DuplicateRows} completed in ${duplicateRowsResult.executionTime.toFixed(2)}ms`,
    );
    duplicateRowsStrategy.printResults(duplicateRowsResult);
  }

  // 2. Run repeatedColumnSequences second if requested
  if (strategies.includes(StrategyName.RepeatedColumnSequences)) {
    console.log(
      `\n🔍 Running ${StrategyName.RepeatedColumnSequences} strategy...`,
    );
    const result = await repeatedColumnSequencesStrategy.execute(
      excelFileData,
      dependencies,
    );
    console.log(
      `✅ ${StrategyName.RepeatedColumnSequences} completed in ${result.executionTime.toFixed(2)}ms`,
    );
    repeatedColumnSequencesStrategy.printResults(result);
  }

  // 3. Run individualNumbers last if requested, with duplicate rows results
  if (strategies.includes(StrategyName.IndividualNumbers)) {
    console.log(`\n🔍 Running ${StrategyName.IndividualNumbers} strategy...`);
    const individualNumbersDependencies = {
      ...dependencies,
      previousResults: duplicateRowsResult ? [duplicateRowsResult] : [],
    };
    const result = await individualNumbersStrategy.execute(
      excelFileData,
      individualNumbersDependencies,
    );
    console.log(
      `✅ ${StrategyName.IndividualNumbers} completed in ${result.executionTime.toFixed(2)}ms`,
    );
    individualNumbersStrategy.printResults(result);
  }
}
