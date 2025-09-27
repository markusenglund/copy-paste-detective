import { describe, it, expect, beforeAll } from "@jest/globals";

import { loadExcelFileFromFolder } from "../../src/utils/loadExcelFileFromFolder";

import { ExcelFileData } from "../../src/types/ExcelFileData";
import { Sheet } from "../../src/entities/Sheet";
import { categorizeColumns } from "../../src/columnCategorization/columnCategorization";

describe("Cooperative breeding in birds increases the within-year fecundity mean", () => {
  let sheet: Sheet;

  beforeAll(() => {
    const datasetFolder =
      "benchmark-files/doi_10_5061_dryad_k0p2ngfk3__v20250416";
    const excelFileData: ExcelFileData = loadExcelFileFromFolder(
      datasetFolder,
      1,
    );
    sheet = excelFileData.sheets[0];
  });

  it("correctly categorizes columns with repeating fractions and square roots", () => {
    const columnCategorization = categorizeColumns(sheet);
    const isRepeatingFractionByColumnName = Object.fromEntries(
      columnCategorization.map((cat) => [
        cat.column.combinedColumnName,
        cat.attributes.isRepeatingFraction,
      ]),
    );
    const expectedIsRepeatingFractionByColumnName = {
      Species: false,
      Latitude: false,
      Longitude: false,
      "Research years": false,
      BSCooMean: true,
      BSCooSD: false,
      CooCombinedSD: false,
      BSCoon: false,
      BSNonCooMean: true,
      BSNonCooSD: false,
      NonCooCombinedSD: false,
      BSNonCoon: false,
      Data_Validity: false,
      References: false,
    };
    expect(isRepeatingFractionByColumnName).toEqual(
      expectedIsRepeatingFractionByColumnName,
    );
  });
});
