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

describe("Persistent social interactions in social spiders", () => {
  let excelFileData: ExcelFileData;
  const categorizedColumnsBySheet = new Map<string, CategorizedColumn[]>();

  beforeAll(async () => {
    const datasetFolder = "benchmark-files/doi_10_5061_dryad_mt688__v20140814";
    excelFileData = loadExcelFileFromFolder(datasetFolder, 0);

    const uniqueColumns = new Set([
      "Prosoma",
      "Boldness.1",
      "Boldness.2",
      "Boldness.3",
      "Boldness.4",
    ]);

    const columns: CategorizedColumn[] = (
      await categorizeColumns(excelFileData.sheets[0], excelFileData, {
        excludeAiProfile: true,
      })
    ).map((column) => ({
      ...column,
      isIncludedInAnalysis: uniqueColumns.has(column.name) || false,
    }));
    categorizedColumnsBySheet.set(excelFileData.sheets[0].name, columns);
  });

  describe("Duplicate rows strategy", () => {
    it("should detect duplicate row pair at rows 57 and 93 with 2 matching columns", async () => {
      const result = await runDuplicateRowsStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetDuplicate = result.duplicateRows.find((duplicateRow) => {
        const rowIndices = duplicateRow.rowIndices;
        return rowIndices[0] === 56 && rowIndices[1] === 92;
      });

      expect(targetDuplicate).toBeDefined();
      expect(targetDuplicate!.sharedColumns).toHaveLength(2);
      expect([SuspicionLevel.Low, SuspicionLevel.Medium]).toContain(
        targetDuplicate?.suspicionLevel,
      );
    });

    it("should detect duplicate row pair at rows 264 and 285 with 4 matching columns", async () => {
      const result = await runDuplicateRowsStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetDuplicate = result.duplicateRows.find((duplicateRow) => {
        const rowIndices = duplicateRow.rowIndices;
        return rowIndices[0] === 263 && rowIndices[1] === 284;
      });

      expect(targetDuplicate).toBeDefined();
      expect(targetDuplicate!.sharedColumns).toHaveLength(4);
      expect(targetDuplicate?.suspicionLevel).toBe(SuspicionLevel.Low);
    });
  });

  describe("Repeated column sequences strategy", () => {
    it("should find a duplicated sequence of 6 rows starting on G8 and G387", async () => {
      const result = await runRepeatedColumnSequencesStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetSequence = result.sequences.find(
        (resultSequence) =>
          resultSequence.positions[0].cellId === "G8" &&
          resultSequence.positions[1].cellId === "G387",
      );

      expect(targetSequence).toBeDefined();
      expect(targetSequence!.values.length).toBe(6);
      expect([SuspicionLevel.Medium, SuspicionLevel.High]).toContain(
        targetSequence!.suspicionLevel,
      );
    });
    it("should find a triple duplicated sequence of 3 rows starting on I56, I293 and somewhere else", async () => {
      const result = await runRepeatedColumnSequencesStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetSequence = result.sequences.find(
        (resultSequence) =>
          resultSequence.positions[0].cellId === "I56" &&
          resultSequence.positions[1].cellId === "I293",
      );

      expect(targetSequence).toBeDefined();
      expect(targetSequence!.values.length).toBe(3);
      expect([SuspicionLevel.Medium, SuspicionLevel.High]).toContain(
        targetSequence!.suspicionLevel,
      );
      expect(targetSequence!.positions.length).toBe(3);
    });
  });
});
