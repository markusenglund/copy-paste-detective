import { describe, it, expect, beforeAll } from "@jest/globals";
import { runDuplicateRowsStrategy } from "../strategies/duplicateRows/runDuplicateRowsStrategy";
import { Sheet } from "../entities/Sheet";
import { MetadataSchema } from "../types/metadata";
import { StrategyContext, StrategyName } from "../types/strategies";
import { createMockCategorizeColumns } from "../ai/MockColumnCategorizer";
import { readFileSync } from "fs";
import path from "path";
import xlsx from "xlsx";

describe("Dryad Dataset Integration Test", () => {
  let sheets: Sheet[];
  let context: StrategyContext;

  beforeAll(() => {
    // Load the actual Dryad dataset
    const datasetFolder =
      "benchmark-files/doi_10_5061_dryad_ksn02v7ft__v20250416";
    const metadataPath = path.join(datasetFolder, "metadata.json");

    // Read and validate metadata
    const metadataContent = readFileSync(metadataPath, "utf-8");
    const metadataJson = JSON.parse(metadataContent);
    const metadata = MetadataSchema.parse(metadataJson);

    // Load Excel file
    const excelPath = path.join(datasetFolder, metadata.files[0].name);
    const workbook = xlsx.readFile(excelPath, { sheetRows: 5000 });

    // Create Sheet objects
    sheets = workbook.SheetNames.map(sheetName => {
      const workbookSheet = workbook.Sheets[sheetName];
      return new Sheet(workbookSheet, sheetName);
    });

    // Setup strategy context
    context = {
      excelDataFolder: datasetFolder,
      excelFileName: metadata.files[0].name,
      articleName: metadata.name
    };
  });

  describe("Duplicate Rows Strategy", () => {
    it("should detect the expected duplicate row patterns in Dryad dataset", async () => {
      // Create mock categorizeColumns function with expected categorization
      const mockCategorizeColumns = createMockCategorizeColumns({
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
          "Other notes"
        ],
        shared: [
          "Individual",
          "Date collected",
          "Tissue",
          "Pre or post digestion",
          "Date Run"
        ]
      });

      const result = await runDuplicateRowsStrategy(sheets, context, {
        categorizeColumns: mockCategorizeColumns
      });

      // Verify basic result structure
      expect(result.name).toBe(StrategyName.DuplicateRows);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.duplicateRows).toBeDefined();

      // Should find exactly 2 duplicate row pairs
      expect(result.duplicateRows).toHaveLength(2);

      // Verify the first result (rows 36, 38 in 1-based indexing)
      const firstResult = result.duplicateRows[0];
      expect(firstResult.rowIndices).toEqual([35, 37]);
      expect(firstResult.sharedColumns).toHaveLength(9);
      expect(firstResult.sharedValues).toHaveLength(9);

      // Verify the second result (rows 54, 55 in 1-based indexing)
      const secondResult = result.duplicateRows[1];
      expect(secondResult.rowIndices).toEqual([53, 54]);
      expect(secondResult.sharedColumns).toHaveLength(2);
      expect(secondResult.sharedValues).toHaveLength(2);
    });
  });
});
