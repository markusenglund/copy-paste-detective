import { describe, it, expect, beforeAll } from "@jest/globals";
import { runDuplicateRowsStrategy } from "../../src/strategies/duplicateRows/runDuplicateRowsStrategy";
import { runRepeatedColumnSequencesStrategy } from "../../src/strategies/repeatedColumnSequences/runRepeatedColumnSequencesStrategy";
import { runIndividualNumbersStrategy } from "../../src/strategies/individualNumbers/runIndividualNumbersStrategy";
import { Sheet } from "../../src/entities/Sheet";
import { StrategyName } from "../../src/types/strategies";
import { SuspicionLevel } from "../../src/types";
import { loadExcelFileFromFolder } from "../../src/utils/loadExcelFileFromFolder";
import { ExcelFileData } from "../../src/types/ExcelFileData";
import { ColumnCategorization } from "../../src/ai/ColumnCategorizer";

describe("Hawk Owl Feeding Study", () => {
  let excelFileData: ExcelFileData;
  let sheets: Sheet[];
  const categorizedColumnsBySheet = new Map<string, ColumnCategorization>();

  beforeAll(() => {
    // Load the actual Dryad dataset
    const datasetFolder =
      "benchmark-files/doi_10_5061_dryad_ksn02v7ft__v20250416";

    excelFileData = loadExcelFileFromFolder(datasetFolder, 0);
    sheets = excelFileData.sheets;
    const mockCategorizedColumns = {
      unique: [
        "Day of Study",
        "ẟ13Ccollagen (‰)",
        "Weight %C",
        "Amp 44",
        "ẟ15N (‰)",
        "Weight %N",
        "Amp 28",
        "Weight % C:N",
        "Atomic C:N",
        "ẟ13Cbioapatite (‰, VPDB)",
        "ẟ18O (‰, VPDB)",
        "87Sr/86Sr",
        "max error from blank",
        "Sr concentration (measured)",
        "Sr concentration (accounting for sample mass)",
        "max blank Sr/sample Sr",
        "Pellet notes",
        "Fecal appearance notes",
        "Other notes",
      ],
      shared: [
        "Individual",
        "Date collected",
        "Tissue",
        "Pre or post digestion",
        "Date Run",
      ],
      motivation: "",
    };

    categorizedColumnsBySheet.set(sheets[0].name, mockCategorizedColumns);
  });

  describe("Duplicate Rows Strategy", () => {
    it("should detect the expected duplicate row patterns", async () => {
      // Create mock categorizeColumns function with expected categorization

      const result = await runDuplicateRowsStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });

      // Verify basic result structure
      expect(result.name).toBe(StrategyName.DuplicateRows);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.duplicateRows).toBeDefined();

      // Should find exactly 2 duplicate row pairs
      expect(result.duplicateRows).toHaveLength(2);

      // Verify the first result (rows 36, 38 in 1-based indexing) has High suspicion
      const firstResult = result.duplicateRows[0];
      expect(firstResult.rowIndices).toEqual([35, 37]);
      expect(firstResult.sharedColumns).toHaveLength(9);
      expect(firstResult.sharedValues).toHaveLength(9);
      expect(firstResult.suspicionLevel).toBe(SuspicionLevel.High);

      // Verify the second result (rows 54, 55 in 1-based indexing) has a Low or Medium suspicion level
      const secondResult = result.duplicateRows[1];
      expect(secondResult.rowIndices).toEqual([53, 54]);
      expect(secondResult.sharedColumns).toHaveLength(2);
      expect(secondResult.sharedValues).toHaveLength(2);
      expect([SuspicionLevel.Medium, SuspicionLevel.Low]).toContain(
        secondResult.suspicionLevel,
      );
    });
  });

  describe("Repeated Column Sequences Strategy", () => {
    it("should find zero repeated sequences", async () => {
      const result = await runRepeatedColumnSequencesStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });

      // Verify basic result structure
      expect(result.name).toBe(StrategyName.RepeatedColumnSequences);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.sequences).toBeDefined();

      // Should find zero repeated sequences (this test is expected to fail)
      expect(result.sequences).toHaveLength(0);
    });
  });

  describe("Individual Numbers Strategy", () => {
    it("should NOT report Q103 and Q155 as duplicates", () => {
      const result = runIndividualNumbersStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      // Verify basic result structure
      expect(result.name).toBe(StrategyName.IndividualNumbers);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.duplicateValues).toBeDefined();

      // Check that Q103 and Q155 are NOT reported as duplicates (this test should fail)
      const hasCellsQ103AndQ155 = result.duplicateValues.some((duplicate) => {
        const cellIds = duplicate.cells.map((cell) => cell.cellId);
        return cellIds.includes("Q103") && cellIds.includes("Q155");
      });

      expect(hasCellsQ103AndQ155).toBe(false);
    });

    it("should report F54 and F55 as a High suspicion duplicate pair", () => {
      const result = runIndividualNumbersStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });

      // Find the duplicate value that contains both F54 and F55
      const f54F55Duplicate = result.duplicateValues.find((duplicate) => {
        const cellIds = duplicate.cells.map((cell) => cell.cellId);
        return cellIds.includes("F54") && cellIds.includes("F55");
      });

      expect(f54F55Duplicate).toBeDefined();
      expect(f54F55Duplicate!.suspicionLevel).toBe(SuspicionLevel.High);
    });
  });
});
