import { describe, it, expect } from "@jest/globals";
import { findDuplicateRows } from "../findDuplicateRows";
import { Sheet } from "../../entities/Sheet";
import type { ColumnCategorization } from "../../ai/geminiService";
import xlsx from "xlsx";

// Helper function to create a mock sheet with test data
function createMockSheet(
  sheetName: string,
  data: (string | number | null)[][]
): Sheet {
  const worksheet = xlsx.utils.aoa_to_sheet(data);
  const sheet = new Sheet(worksheet, sheetName);
  return sheet;
}

// Helper function to create mock column categorization
function createColumnCategorization(
  unique: string[],
  shared: string[] = []
): ColumnCategorization {
  return { unique, shared };
}

describe("findDuplicateRows", () => {
  describe("basic duplicate detection", () => {
    it("should find rows with high-entropy duplicate values", () => {
      const data = [
        ["ID", "Value", "Score"],
        [1234567, 100, 85],
        [7654321, 200, 90],
        [1234567, 300, 95], // Duplicate ID with different other values
        [9876543, 400, 80]
      ];

      const sheet = createMockSheet("TestSheet", data);
      const columnCategorization = createColumnCategorization(["ID"]);

      const result = findDuplicateRows(sheet, columnCategorization);

      expect(result.duplicateRows).toHaveLength(1);
      expect(result.duplicateRows[0].rowIndices).toEqual([1, 3]);
      expect(result.duplicateRows[0].sharedValues).toContain(1234567);
      expect(result.duplicateRows[0].totalSharedCount).toBe(1);
    });

    it("should find multiple shared values between rows", () => {
      const data = [
        ["ID", "SecondaryID", "Name"],
        [1234567, 9876543, "Alice"],
        [7654321, 5555555, "Bob"],
        [1234567, 9876543, "Charlie"], // Same ID and SecondaryID
        [1111111, 2222222, "David"]
      ];

      const sheet = createMockSheet("TestSheet", data);
      const columnCategorization = createColumnCategorization([
        "ID",
        "SecondaryID"
      ]);

      const result = findDuplicateRows(sheet, columnCategorization);

      expect(result.duplicateRows).toHaveLength(1);
      expect(result.duplicateRows[0].sharedValues).toHaveLength(2);
      expect(result.duplicateRows[0].sharedValues).toContain(1234567);
      expect(result.duplicateRows[0].sharedValues).toContain(9876543);
    });
  });

  describe("edge cases", () => {
    it("should return empty result when no duplicates exist", () => {
      const data = [
        ["ID", "Value"],
        [1234567, 100],
        [7654321, 200],
        [9876543, 300]
      ];

      const sheet = createMockSheet("TestSheet", data);
      const columnCategorization = createColumnCategorization(["ID"]);

      const result = findDuplicateRows(sheet, columnCategorization);

      expect(result.duplicateRows).toHaveLength(0);
    });

    test("should handle empty sheets", () => {
      const data = [["ID", "Value"]]; // Only header row

      const sheet = createMockSheet("TestSheet", data);
      const columnCategorization = createColumnCategorization(["ID"]);

      const result = findDuplicateRows(sheet, columnCategorization);

      expect(result.duplicateRows).toHaveLength(0);
    });

    test("should return empty result when no unique columns are found", () => {
      const data = [
        ["ID", "Value"],
        [1234567, 100],
        [1234567, 200]
      ];

      const sheet = createMockSheet("TestSheet", data);
      const columnCategorization = createColumnCategorization([
        "NonExistentColumn"
      ]);

      const result = findDuplicateRows(sheet, columnCategorization);

      expect(result.duplicateRows).toHaveLength(0);
    });

    test("should filter out low entropy values", () => {
      const data = [
        ["ID", "SimpleValue"],
        [1, 100], // Low entropy ID
        [2, 200],
        [1, 300] // Duplicate low entropy ID
      ];

      const sheet = createMockSheet("TestSheet", data);
      const columnCategorization = createColumnCategorization(["ID"]);

      const result = findDuplicateRows(sheet, columnCategorization);

      // Should not find duplicates because entropy of value "1" is too low
      expect(result.duplicateRows).toHaveLength(0);
    });
  });

  describe("column categorization filtering", () => {
    test("should only check columns marked as unique", () => {
      const data = [
        ["ID", "SharedValue", "Name"],
        [1234567, 1.7392828, "Alice"],
        [7654321, 1.7392828, "Bob"], // Same SharedValue but different ID
        [1234567, 1.4301292, "Charlie"] // Same ID but different SharedValue
      ];

      const sheet = createMockSheet("TestSheet", data);
      const columnCategorization = createColumnCategorization(
        ["ID"],
        ["SharedValue"]
      );

      const result = findDuplicateRows(sheet, columnCategorization);

      expect(result.duplicateRows).toHaveLength(1);
      expect(result.duplicateRows[0].sharedValues).toContain(1234567);
      expect(result.duplicateRows[0].sharedValues).not.toContain(1.7392828); // SharedValue not checked
    });

    test("should ignore non-numeric columns", () => {
      const data = [
        ["ID", "TextColumn"],
        [1234567, "duplicate"],
        [7654321, "different"],
        [1234567, "duplicate"] // Same ID and text, but text should be ignored
      ];

      const sheet = createMockSheet("TestSheet", data);
      const columnCategorization = createColumnCategorization([
        "ID",
        "TextColumn"
      ]);

      const result = findDuplicateRows(sheet, columnCategorization);

      expect(result.duplicateRows).toHaveLength(1);
      expect(result.duplicateRows[0].sharedValues).toHaveLength(1);
      expect(result.duplicateRows[0].sharedValues).toContain(1234567);
    });
  });

  describe("entropy scoring and sorting", () => {
    test("should sort results by row entropy score", () => {
      const data = [
        ["ID", "SecondaryID"],
        [121212, 2222222], // Lower entropy pair
        [989898, 898989], // Higher entropy pair
        [121212, 3333333], // Same ID as first row
        [989898, 898989] // Exact duplicate of second row
      ];

      const sheet = createMockSheet("TestSheet", data);
      const columnCategorization = createColumnCategorization([
        "ID",
        "SecondaryID"
      ]);

      const result = findDuplicateRows(sheet, columnCategorization);

      expect(result.duplicateRows.length).toBeGreaterThan(0);

      // Results should be sorted by entropy score descending
      for (let i = 1; i < result.duplicateRows.length; i++) {
        expect(
          result.duplicateRows[i - 1].rowEntropyScore
        ).toBeGreaterThanOrEqual(result.duplicateRows[i].rowEntropyScore);
      }
    });
  });
});
