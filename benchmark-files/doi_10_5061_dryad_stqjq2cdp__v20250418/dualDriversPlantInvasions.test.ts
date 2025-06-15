import { describe, it, expect, beforeAll } from "@jest/globals";
import { runDuplicateRowsStrategy } from "../../src/strategies/duplicateRows/runDuplicateRowsStrategy";
import { runIndividualNumbersStrategy } from "../../src/strategies/individualNumbers/runIndividualNumbersStrategy";
import { Sheet } from "../../src/entities/Sheet";
import { MetadataSchema } from "../../src/types/metadata";
import { StrategyContext, StrategyName } from "../../src/types/strategies";
import { SuspicionLevel } from "../../src/types";
import { createMockCategorizeColumns } from "../../src/ai/MockColumnCategorizer";
import { readFileSync } from "fs";
import path from "path";
import xlsx from "xlsx";

describe("Dual Drivers of Plant Invasions", () => {
  let sheets: Sheet[];
  let context: StrategyContext;

  beforeAll(() => {
    // Load the actual Dryad dataset
    const datasetFolder =
      "benchmark-files/doi_10_5061_dryad_stqjq2cdp__v20250418";
    const metadataPath = path.join(datasetFolder, "metadata.json");

    // Read and validate metadata
    const metadataContent = readFileSync(metadataPath, "utf-8");
    const metadataJson = JSON.parse(metadataContent);
    const metadata = MetadataSchema.parse(metadataJson);

    // Load Excel file (use the first file for now)
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
    let mockCategorizeColumns: ReturnType<typeof createMockCategorizeColumns>;

    beforeAll(() => {
      // Create shared mock categorizeColumns function
      mockCategorizeColumns = createMockCategorizeColumns({
        unique: [
          "Time",
          "Plot",
          "Species",
          "Treatment",
          "Coarse root soluble sugar concentrations(mg/g)",
          "Fine root soluble sugar concentrations(mg/g)",
          "AMF colonization rate(%)",
          "Damage(%)",
          "Aboveground mass(g)",
          "Belowground mass(g)",
          "Root length(cm)",
          "Root surface area(cm2)",
          "Root average diameter(mm)",
          "Root volume(cm3)",
          "Root tissue density(g/cm3)",
          "Fine root length(cm)",
          "Coarse root length(cm)",
          "Fine root surface area(cm2)",
          "Coarse root  surface area(cm2)"
        ],
        shared: ["Name", "Origin"]
      });
    });

    it("should detect duplicate row pair at rows 354 and 358 with 3 matching columns", async () => {
      const result = await runDuplicateRowsStrategy(sheets, context, {
        categorizeColumns: mockCategorizeColumns
      });

      // Verify basic result structure
      expect(result.name).toBe(StrategyName.DuplicateRows);
      expect(result.duplicateRows).toBeDefined();

      // Find the specific duplicate row pair (rows 354, 358 in 1-based indexing)
      const targetDuplicate = result.duplicateRows.find(duplicateRow => {
        const rowIndices = duplicateRow.rowIndices;
        return rowIndices[0] === 353 && rowIndices[1] === 357;
      });

      expect(targetDuplicate).toBeDefined();
      expect(targetDuplicate!.sharedColumns).toHaveLength(3);
      expect([SuspicionLevel.Medium, SuspicionLevel.High]).toContain(
        targetDuplicate!.suspicionLevel
      );
    });

    it("should detect duplicate row pair at rows 96 and 330 with 3 matching columns", async () => {
      const result = await runDuplicateRowsStrategy(sheets, context, {
        categorizeColumns: mockCategorizeColumns
      });

      // Find the specific duplicate row pair (rows 96, 330 in 1-based indexing)
      const targetDuplicate = result.duplicateRows.find(duplicateRow => {
        const rowIndices = duplicateRow.rowIndices;
        return rowIndices[0] === 95 && rowIndices[1] === 329;
      });

      expect(targetDuplicate).toBeDefined();
      expect(targetDuplicate!.sharedColumns).toHaveLength(3);
      expect([SuspicionLevel.Medium, SuspicionLevel.High]).toContain(
        targetDuplicate!.suspicionLevel
      );
    });
  });

  describe("Individual Numbers Strategy", () => {
    it("should detect duplicate value 106.9391 in S354, S358 & S242", async () => {
      const result = runIndividualNumbersStrategy(sheets, context);

      // Verify basic result structure
      expect(result.name).toBe(StrategyName.IndividualNumbers);
      expect(result.duplicateValues).toBeDefined();

      // Find the duplicate value 106.9391
      const targetValue = 106.9391;
      const targetDuplicate = result.duplicateValues.find(
        duplicate => duplicate.value === targetValue
      );

      expect(targetDuplicate).toBeDefined();

      const cellIds = targetDuplicate!.cells.map(cell => cell.cellId);
      expect(cellIds).toContain("S354");
      expect(cellIds).toContain("S358");
      expect(cellIds).toContain("S242");
      expect(targetDuplicate!.suspicionLevel).toBe(SuspicionLevel.Medium);
    });

    it("should detect duplicate value 154.5642 in S15 & S353", async () => {
      const result = runIndividualNumbersStrategy(sheets, context);

      // Find the duplicate value 154.5642
      const targetValue = 154.5642;
      const targetDuplicate = result.duplicateValues.find(
        duplicate => duplicate.value === targetValue
      );

      expect(targetDuplicate).toBeDefined();

      const cellIds = targetDuplicate!.cells.map(cell => cell.cellId);
      expect(cellIds).toContain("S15");
      expect(cellIds).toContain("S353");
      expect(targetDuplicate!.suspicionLevel).toBe(SuspicionLevel.Medium);
    });

    it("should detect duplicate value 118.8588 in S85 & S193", async () => {
      const result = runIndividualNumbersStrategy(sheets, context);

      // Find the duplicate value 118.8588
      const targetValue = 118.8588;
      const targetDuplicate = result.duplicateValues.find(
        duplicate => duplicate.value === targetValue
      );

      expect(targetDuplicate).toBeDefined();

      const cellIds = targetDuplicate!.cells.map(cell => cell.cellId);
      expect(cellIds).toContain("S85");
      expect(cellIds).toContain("S193");
      expect(targetDuplicate!.suspicionLevel).toBe(SuspicionLevel.Medium);
    });
  });
});
