import { describe, beforeAll, it, expect } from "@jest/globals";
import { Sheet } from "../Sheet";
import path from "path";
import xlsx from "xlsx";
import { fileURLToPath } from "url";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const excelFilePath = path.join(
  dirname,
  "spreadsheet-with-merged-headers.xlsx",
);

describe("Header parsing", () => {
  let sheet: Sheet;

  beforeAll(() => {
    const workbook = xlsx.readFile(excelFilePath);
    const sheetName = "Sheet1";
    const workbookSheet = workbook.Sheets[sheetName];
    sheet = new Sheet(workbookSheet, sheetName);
  });

  it("Identifies the correct header rows and first data row", () => {
    expect(sheet.headerRowIndices).toEqual([1, 2, 3]);
    expect(sheet.firstDataRowIndex).toBe(4);
  });

  it("Identifies the correct column names", () => {
    expect(sheet.columnNames).toEqual([
      "",
      "mEPSC frequency - ΔCre - Vehicle",
      "mEPSC frequency - ΔCre - LY379268",
      "mEPSC frequency - Cre - Vehicle",
      "mEPSC frequency - Cre - LY379268",
      "",
      "mEPSC amplitude - ΔCre - Vehicle",
      "mEPSC amplitude - ΔCre - LY379268",
      "mEPSC amplitude - Cre - Vehicle",
      "mEPSC amplitude - Cre - LY379268",
      "",
      "",
      "1st NMDA-EPSC - ΔCre - Vehicle",
      "1st NMDA-EPSC - ΔCre - LY379268",
      "1st NMDA-EPSC - Cre - Vehicle",
      "1st NMDA-EPSC - Cre - LY379268",
      "",
      "PPR - ΔCre - Vehicle",
      "PPR - ΔCre - LY379268",
      "PPR - Cre - Vehicle",
      "PPR - Cre - LY379268",
    ]);
  });
});
