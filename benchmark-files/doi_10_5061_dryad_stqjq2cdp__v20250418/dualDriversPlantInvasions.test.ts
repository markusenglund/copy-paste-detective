import { describe, it, expect, beforeAll } from "@jest/globals";
import { runDuplicateRowsStrategy } from "../../src/strategies/duplicateRows/runDuplicateRowsStrategy";
import { runIndividualNumbersStrategy } from "../../src/strategies/individualNumbers/runIndividualNumbersStrategy";
import { Sheet } from "../../src/entities/Sheet";
import { StrategyName } from "../../src/types/strategies";
import { SuspicionLevel } from "../../src/types";
import { createMockCategorizeColumns } from "../../src/ai/MockColumnCategorizer";
import { loadExcelFileFromFolder } from "../../src/utils/loadExcelFileFromFolder";
import { ExcelFileData } from "../../src/types/ExcelFileData";

describe("Dual Drivers of Plant Invasions - Common garden", () => {
  let excelFileData: ExcelFileData;

  beforeAll(() => {
    // Load the actual Dryad dataset
    const datasetFolder =
      "benchmark-files/doi_10_5061_dryad_stqjq2cdp__v20250418";

    excelFileData = loadExcelFileFromFolder(datasetFolder, 0);
  });

  describe("Duplicate Rows Strategy", () => {
    let categorizeColumnsBySheet: Map<string, ReturnType<typeof createMockCategorizeColumns>>;

    beforeAll(() => {
      // Create sheet-specific mock categorizeColumns functions
      categorizeColumnsBySheet = new Map();
      
      // Mock categorizer for "common garden-data" sheet
      categorizeColumnsBySheet.set("common garden-data", createMockCategorizeColumns({
        unique: [
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
        shared: ["Time", "Name", "Origin"]
      }));
      
      // Mock categorizer for "common garden-Herbiory" sheet
      categorizeColumnsBySheet.set("common garden-Herbiory", createMockCategorizeColumns({
        unique: [
          "Plot",
          "Species",
          "Insects(#)",
          "no-Hemiptera(#)",
          "Neuroptera(#)",
          "Hemiptera(#)",
          "Orthoptera(#)",
          "Lepidoptera(#)",
          "Araneida(#)",
          "Coleoptera(#)",
          "Diptera(#)",
          "Hymenoptera(#)",
          "others(#)"
        ],
        shared: ["Time", "Name", "Origin", "Treatment"]
      }));
    });

    it("should detect duplicate row pair at rows 354 and 358 with 3 matching columns", async () => {
      const result = await runDuplicateRowsStrategy(excelFileData, {
        categorizeColumnsBySheet
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
      const result = await runDuplicateRowsStrategy(excelFileData, {
        categorizeColumnsBySheet
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
      const result = runIndividualNumbersStrategy(excelFileData);

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
      const result = runIndividualNumbersStrategy(excelFileData);

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
      const result = runIndividualNumbersStrategy(excelFileData);

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
