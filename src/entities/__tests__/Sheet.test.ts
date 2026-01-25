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
    sheet = new Sheet(workbookSheet, sheetName, excelFilePath);
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

describe("Header parsing in sheet with crazy headers", () => {
  let sheet: Sheet;

  beforeAll(() => {
    const workbook = xlsx.readFile(excelFilePath);
    const sheetName = "Sheet2";
    const workbookSheet = workbook.Sheets[sheetName];
    sheet = new Sheet(workbookSheet, sheetName, excelFilePath);
  });

  it("Skip the 'S4' heading but keep 'Guide' heading since it's not followed by real headers", () => {
    expect(sheet.columnNames).toEqual([
      "Age (Ma)",
      "Age Error (Truncated) (My)",
      "Locality",
      "Table S4: Compilation of localities and input parameters for the PBUQ model (Breecker, 2013)",
      "Paleosol Type",
      "d13Ccalc (‰)",
      "d13Ccalc  error (‰)",
      "Temp. (°C)",
      "Temp. Error (°C)",
      "d13Com (d13COOM or d13CPOM) (‰)",
      "d13Com (d13COOM or d13CPOM) error (‰)",
      "d13Ccarb  (‰)",
      "d13Ccarb error (‰)",
      "CO2 estimate",
      "CO2 16th percentile",
      "CO2 84th percentile",
      "",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
      "Guide (See Main and Supplemental Materials and Methods in Richey at al., 2020 for further details)",
    ]);
  });
});
