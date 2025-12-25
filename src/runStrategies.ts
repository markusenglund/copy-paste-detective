import {
  DuplicateRowsResult,
  IndividualNumbersResult,
  RepeatedColumnSequencesResult,
  StrategyName,
} from "./types/strategies";
import individualNumbersStrategy from "./strategies/individualNumbers/individualNumbers";
import repeatedColumnSequencesStrategy from "./strategies/repeatedColumnSequences/repeatedColumnSequences";
import duplicateRowsStrategy from "./strategies/duplicateRows/duplicateRows";
import { ExcelFileData } from "./types/ExcelFileData";
import {
  categorizeColumns,
  CategorizedColumn,
} from "./columnCategorization/columnCategorization";
import { reviewResults } from "./resultsReview/resultsReview";

type StrategyResults = {
  [StrategyName.IndividualNumbers]?: IndividualNumbersResult;
  [StrategyName.RepeatedColumnSequences]?: RepeatedColumnSequencesResult;
  [StrategyName.DuplicateRows]?: DuplicateRowsResult;
};

export async function runStrategies(
  strategies: StrategyName[],
  excelFileData: ExcelFileData,
): Promise<StrategyResults> {
  console.log("🔍 Running strategies:", strategies.join(", "));
  const { sheets } = excelFileData;
  console.log(
    `Found ${sheets.length} sheet(s): ${sheets.map((s) => s.name).join(", ")}`,
  );

  const results: StrategyResults = {};
  const categorizedColumnsBySheet = new Map<string, CategorizedColumn[]>();
  await Promise.all(
    sheets.map(async (sheet) => {
      const categorizedColumns = await categorizeColumns(sheet, excelFileData, {
        excludeAiProfile: false,
      });

      categorizedColumnsBySheet.set(sheet.name, categorizedColumns);
    }),
  );

  let duplicateRowsResult;

  // 1. Run duplicateRows first if requested
  if (strategies.includes(StrategyName.DuplicateRows)) {
    console.log(`\n🔍 Running ${StrategyName.DuplicateRows} strategy...`);
    duplicateRowsResult = await duplicateRowsStrategy.execute(excelFileData, {
      categorizedColumnsBySheet,
    });
    console.log(
      `✅ ${StrategyName.DuplicateRows} completed in ${duplicateRowsResult.executionTime.toFixed(2)}ms`,
    );
    duplicateRowsStrategy.printResults(duplicateRowsResult);
    results[StrategyName.DuplicateRows] = duplicateRowsResult;
  }

  // 2. Run repeatedColumnSequences second if requested
  if (strategies.includes(StrategyName.RepeatedColumnSequences)) {
    console.log(
      `\n🔍 Running ${StrategyName.RepeatedColumnSequences} strategy...`,
    );
    const result = await repeatedColumnSequencesStrategy.execute(
      excelFileData,
      { categorizedColumnsBySheet },
    );
    console.log(
      `✅ ${StrategyName.RepeatedColumnSequences} completed in ${result.executionTime.toFixed(2)}ms`,
    );
    repeatedColumnSequencesStrategy.printResults(result);
    results[StrategyName.RepeatedColumnSequences] = result;
  }

  // 3. Run individualNumbers last if requested, with duplicate rows results
  if (strategies.includes(StrategyName.IndividualNumbers)) {
    console.log(`\n🔍 Running ${StrategyName.IndividualNumbers} strategy...`);
    const individualNumbersDependencies = {
      categorizedColumnsBySheet,
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
    results[StrategyName.IndividualNumbers] = result;
  }

  await reviewResults(
    excelFileData,
    categorizedColumnsBySheet,
    results[StrategyName.DuplicateRows],
    results[StrategyName.RepeatedColumnSequences],
  );

  return results;
}
