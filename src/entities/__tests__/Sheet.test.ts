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

  it("Identifies the correct rows and header rows", () => {
    expect(sheet.headerRowIndices).toEqual([1, 2, 3]);
  });
});
