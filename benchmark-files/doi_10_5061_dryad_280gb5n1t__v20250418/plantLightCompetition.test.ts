import { describe, it, expect, beforeAll } from "@jest/globals";

import { loadExcelFileFromFolder } from "../../src/utils/loadExcelFileFromFolder";

import { ExcelFileData } from "../../src/types/ExcelFileData";
import { Sheet } from "../../src/entities/Sheet";
import {
  categorizeColumns,
  CategorizedColumn,
} from "../../src/columnCategorization/columnCategorization";
import { pick } from "lodash-es";
import { runDuplicateRowsStrategy } from "../../src/strategies/duplicateRows/runDuplicateRowsStrategy";

describe("Plant responses to light competition", () => {
  describe("Column categorization", () => {
    let sheet: Sheet;
    let excelFileData: ExcelFileData;

    beforeAll(() => {
      const datasetFolder =
        "benchmark-files/doi_10_5061_dryad_280gb5n1t__v20250418";
      excelFileData = loadExcelFileFromFolder(datasetFolder);
      sheet = excelFileData.sheets[0];
    });

    it("correctly categorizes columns with repeating fractions", async () => {
      const categorizedColumns = await categorizeColumns(sheet, excelFileData, {
        excludeAiProfile: true,
      });
      const columnAttributesByName = Object.fromEntries(
        categorizedColumns.map((column) => [
          column.name,
          pick(column, ["isRepeatingFraction", "isSquareRoot", "isLnArgument"]),
        ]),
      );

      const expectedIsRepeatingFractionByColumnName = {
        "Plant ID": {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
        Block: {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
        Population: {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
        "Annual precipitation": {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
        "Neighbor height": {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
        "Neighbor density": {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
        "height:diameter ratio": {
          isRepeatingFraction: true,
          isSquareRoot: false,
          isLnArgument: false,
        },
        "Leaf angle": {
          isRepeatingFraction: true,
          isSquareRoot: false,
          isLnArgument: false,
        },
        "Branching intensity": {
          isRepeatingFraction: true,
          isSquareRoot: false,
          isLnArgument: false,
        },
        "Stem-base diameter": {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
        "Internode length": {
          isRepeatingFraction: true,
          isSquareRoot: false,
          isLnArgument: false,
        },
        SLA: {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
        "Leaf area": {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
        Amax: {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
        Aqe: {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
        LCP: {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
        "Shoot mass": {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
        "inflorescence number": {
          isRepeatingFraction: false,
          isSquareRoot: false,
          isLnArgument: false,
        },
      };

      expect(columnAttributesByName).toEqual(
        expectedIsRepeatingFractionByColumnName,
      );
    });
  });
  describe("Analysis", () => {
    let sheet: Sheet;
    let excelFileData: ExcelFileData;
    const categorizedColumnsBySheet = new Map<string, CategorizedColumn[]>();

    beforeAll(async () => {
      const datasetFolder =
        "benchmark-files/doi_10_5061_dryad_280gb5n1t__v20250418";
      excelFileData = loadExcelFileFromFolder(datasetFolder);
      sheet = excelFileData.sheets[0];

      const uniqueColumnNames = new Set([
        "height:diameter ratio",
        "Leaf angle",
        "Branching intensity",
        "Stem-base diameter",
        "Internode length",
        "SLA (specific leaf area)",
        "Leaf area",
        "Amax (maximal photosynthetic rate)",
        "Aqe (apparent quantum efficiency)",
        "LCP (light compensation point)",
        "Shoot mass",
        "inflorescence number",
        ,
      ]);
      const columns: CategorizedColumn[] = (
        await categorizeColumns(sheet, excelFileData, {
          excludeAiProfile: true,
        })
      ).map((column) => ({
        ...column,
        isIncludedInAnalysis: uniqueColumnNames.has(column.name) || false,
      }));
      categorizedColumnsBySheet.set(sheet.name, columns);
    });

    it("should not detect any duplicate rows", async () => {
      const result = await runDuplicateRowsStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      expect(result.duplicateRows[0]?.sharedValues).toBeUndefined(); // Gives a helpful output
      expect(result.duplicateRows).toHaveLength(0);
    });
  });
});
