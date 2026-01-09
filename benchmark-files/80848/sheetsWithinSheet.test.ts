import { describe, it, expect, beforeAll } from "@jest/globals";
import path from "path";
import xlsx from "xlsx";
import { Sheet } from "../../src/entities/Sheet";

describe("Sheet detectSheetsWithinSheet", () => {
  let sheet: Sheet;

  beforeAll(() => {
    const datasetFolder = "benchmark-files/80848";
    const excelFilePath = path.join(
      datasetFolder,
      "2025_06_10_DRYAD_Eton_APPENDIX_TABLES.xlsx",
    );

    // Load the Excel file
    const workbook = xlsx.readFile(excelFilePath);
    const sheetName = "Appendix tables";
    const workbookSheet = workbook.Sheets[sheetName];

    // Create Sheet entity (triggers detectSheetsWithinSheet)
    sheet = new Sheet(workbookSheet, sheetName, excelFilePath);
  });

  it("should detect sheets within sheet pattern in 'Appendix tables'", () => {
    expect(sheet.hasSheetsWithinSheet).toBe(true);
  });

  it("should identify first sheet ending at row 31 (exclusive)", () => {
    expect(sheet.firstSheetEndRowIndexExclusive).toBe(31);
  });

  it("should truncate matrix to only include first sheet", () => {
    // Since firstSheetEndRowIndexExclusive is 31, numRows should be 31
    expect(sheet.numRows).toBe(31);
  });

  it("should have the sheet name 'Appendix tables'", () => {
    expect(sheet.name).toBe("Appendix tables");
  });
});
