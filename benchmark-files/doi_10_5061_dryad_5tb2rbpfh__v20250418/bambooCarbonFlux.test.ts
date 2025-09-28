import { describe, it, expect, beforeAll } from "@jest/globals";
import { ExcelFileData } from "../../src/types/ExcelFileData";
import { loadExcelFileFromFolder } from "../../src/utils/loadExcelFileFromFolder";
import { runDuplicateRowsStrategy } from "../../src/strategies/duplicateRows/runDuplicateRowsStrategy";
import { SuspicionLevel } from "../../src/types";
import { runRepeatedColumnSequencesStrategy } from "../../src/strategies/repeatedColumnSequences/runRepeatedColumnSequencesStrategy";
import {
  categorizeColumns,
  CategorizedColumn,
} from "../../src/columnCategorization/columnCategorization";

describe("Drought decreases carbon flux in bamboo", () => {
  let excelFileData: ExcelFileData;

  const categorizedColumnsBySheet = new Map<string, CategorizedColumn[]>();

  beforeAll(async () => {
    const datasetFolder =
      "benchmark-files/doi_10_5061_dryad_5tb2rbpfh__v20250418";
    excelFileData = loadExcelFileFromFolder(datasetFolder, 0);

    const uniqueColumnsBySheet = new Map<string, Set<string>>();
    uniqueColumnsBySheet.set(
      "Leaves to Soil",
      new Set([
        "Leave 13C‰",
        "Branches 13C‰",
        "Roots 13C‰",
        "0-15 Soil 13C‰",
        "15-30 Soil 13C‰",
        "Leave 13C atom%",
        "Branches 13C atom%",
        "Roots 13C atom%",
        "0-15 Soil13C atom%",
        "10-30 Soil 13C atom%",
        "Leave 13C amount",
        "Branches 13C amount",
        "Roots 13C amount",
        "0-15 Soil13C amount",
        "10-30 Soil 13C amount",
      ]),
    );
    uniqueColumnsBySheet.set(
      "Soil CO2",
      new Set(["Soil CO2 13C‰", "Soil CO2 atom%", "Soil CO2 amount"]),
    );

    for (const sheet of excelFileData.sheets) {
      const uniqueColumns = uniqueColumnsBySheet.get(sheet.name);
      if (!uniqueColumns) {
        throw new Error(`Unique columns not defined for sheet: ${sheet.name}`);
      }
      const columns: CategorizedColumn[] = (
        await categorizeColumns(sheet, excelFileData, {
          excludeAiProfile: true,
        })
      ).map((column) => ({
        ...column,
        isIncludedInAnalysis: uniqueColumns.has(column.name) || false,
      }));
      categorizedColumnsBySheet.set(sheet.name, columns);
    }
  });

  describe("Duplicate rows strategy", () => {
    it("should detect duplicate row pair at rows 61 and 64 with 7 matching columns", async () => {
      const result = await runDuplicateRowsStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetDuplicate = result.duplicateRows.find((duplicateRow) => {
        const rowIndices = duplicateRow.rowIndices;
        return rowIndices[0] === 60 && rowIndices[1] === 63;
      });

      expect(targetDuplicate).toBeDefined();
      expect(targetDuplicate!.sharedColumns).toHaveLength(7);
      expect(targetDuplicate!.suspicionLevel).toBe(SuspicionLevel.Medium);
    });

    it("should detect duplicate row pair at rows 138 and 147 with 2 matching columns", async () => {
      const result = await runDuplicateRowsStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetDuplicate = result.duplicateRows.find((duplicateRow) => {
        const rowIndices = duplicateRow.rowIndices;
        return rowIndices[0] === 137 && rowIndices[1] === 146;
      });

      expect(targetDuplicate).toBeDefined();
      expect(targetDuplicate!.sharedColumns).toHaveLength(2);
      expect(targetDuplicate!.suspicionLevel).toBe(SuspicionLevel.High);
    });
  });

  describe("Repeated column sequences strategy", () => {
    it("should find a duplicated sequence of 6 rows starting on I119 and I128", async () => {
      const result = await runRepeatedColumnSequencesStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetSequence = result.sequences.find(
        (resultSequence) =>
          resultSequence.positions[0].cellId === "I119" &&
          resultSequence.positions[1].cellId === "I128",
      );

      expect(targetSequence).toBeDefined();
      expect(targetSequence!.values.length).toBe(6);
      expect(targetSequence!.suspicionLevel).toBe(SuspicionLevel.High);
    });
    it("should find a duplicated sequence of 6 rows starting on I137 and I146", async () => {
      const result = await runRepeatedColumnSequencesStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetSequence = result.sequences.find(
        (resultSequence) =>
          resultSequence.positions[0].cellId === "I137" &&
          resultSequence.positions[1].cellId === "I146",
      );

      expect(targetSequence).toBeDefined();
      expect(targetSequence!.values.length).toBe(6);
      expect(targetSequence!.suspicionLevel).toBe(SuspicionLevel.High);
    });
    it("should find a duplicated sequence of 6 rows starting on J119 and J128", async () => {
      const result = await runRepeatedColumnSequencesStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetSequence = result.sequences.find(
        (resultSequence) =>
          resultSequence.positions[0].cellId === "J119" &&
          resultSequence.positions[1].cellId === "J128",
      );

      expect(targetSequence).toBeDefined();
      expect(targetSequence!.values.length).toBe(6);
      expect(targetSequence!.suspicionLevel).toBe(SuspicionLevel.High);
    });
    it("should find a duplicated sequence of 6 rows starting on J137 and J146", async () => {
      const result = await runRepeatedColumnSequencesStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetSequence = result.sequences.find(
        (resultSequence) =>
          resultSequence.positions[0].cellId === "J137" &&
          resultSequence.positions[1].cellId === "J146",
      );

      expect(targetSequence).toBeDefined();
      expect(targetSequence!.values.length).toBe(6);
      expect(targetSequence!.suspicionLevel).toBe(SuspicionLevel.High);
    });
  });
});
