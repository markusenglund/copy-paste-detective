import { Sheet } from "src/entities/Sheet";
import { StrategyName, Strategy, AllStrategyResults, StrategyContext } from "src/types/strategies";
import { IndividualNumbersStrategy } from "src/strategies/individualNumbers";
import { RepeatedColumnSequencesStrategy } from "src/strategies/repeatedColumnSequences";
import { DuplicateRowsStrategy } from "src/strategies/duplicateRows";
import {
  formatSequencesForDisplay,
  formatDuplicatesByEntropyForDisplay,
  formatDuplicatesByOccurrenceForDisplay,
  formatDuplicateRowsForDisplay
} from "src/utils/output";
import xlsx from "xlsx";

const availableStrategies: Record<StrategyName, Strategy> = {
  [StrategyName.IndividualNumbers]: new IndividualNumbersStrategy(),
  [StrategyName.RepeatedColumnSequences]: new RepeatedColumnSequencesStrategy(),
  [StrategyName.DuplicateRows]: new DuplicateRowsStrategy()
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

  // Create Sheet objects for all sheets
  const sheets: Sheet[] = sheetNames.map(sheetName => {
    const workbookSheet = workbook.Sheets[sheetName];
    return new Sheet(workbookSheet, sheetName);
  });

  // Execute selected strategies
  const results: AllStrategyResults[] = [];
  for (const strategyName of strategies) {
    const strategy = availableStrategies[strategyName];
    if (!strategy) {
      console.warn(`⚠️ Unknown strategy: ${strategyName}`);
      continue;
    }

    console.log(`\n🔍 Running ${strategyName} strategy...`);
    const result = await strategy.execute(sheets, context);
    results.push(result as AllStrategyResults);
    console.log(`✅ ${strategyName} completed in ${result.executionTime.toFixed(2)}ms`);
  }

  // Display results
  displayResults(results);
  
  console.timeEnd("Time elapsed");
}

function displayResults(results: AllStrategyResults[]): void {
  for (const result of results) {
    switch (result.name) {
      case StrategyName.IndividualNumbers:
        const humanReadableTopEntropyDuplicateNumbers =
          formatDuplicatesByEntropyForDisplay(result.topEntropyDuplicates);
        const humanReadableTopOccurrenceNumbers =
          formatDuplicatesByOccurrenceForDisplay(result.topOccurrenceHighEntropy);

        console.log(`\nTop entropy duplicate numbers:`);
        console.table(humanReadableTopEntropyDuplicateNumbers);
        console.log(`Top occurrence numbers with entropy>5000:`);
        console.table(humanReadableTopOccurrenceNumbers);
        break;

      case StrategyName.RepeatedColumnSequences:
        const humanReadableSequences = formatSequencesForDisplay(
          result.sequences.slice(0, 20)
        );
        console.log(`\nRepeated sequences:`);
        console.table(humanReadableSequences);
        break;

      case StrategyName.DuplicateRows:
        const sortedDuplicateRows = result.duplicateRows
          .toSorted((a, b) => b.rowEntropyScore - a.rowEntropyScore)
          .slice(0, 20); // Show top 20 most suspicious pairs

        const humanReadableDuplicateRows =
          formatDuplicateRowsForDisplay(sortedDuplicateRows);

        if (humanReadableDuplicateRows.length > 0) {
          console.log(
            `\nDuplicate rows (${result.duplicateRows.length} total, showing top ${humanReadableDuplicateRows.length}):`
          );
          console.table(humanReadableDuplicateRows);
        } else {
          console.log(`\n✅ No duplicate rows found in unique columns!`);
        }
        break;
    }
  }
}