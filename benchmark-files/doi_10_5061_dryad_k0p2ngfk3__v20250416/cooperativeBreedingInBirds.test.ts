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
    const columnAttributesByName = Object.fromEntries(
      columnCategorization.map((cat) => [
        cat.column.combinedColumnName,
        cat.attributes,
      ]),
    );

    const expectedColumnAttributesByName = {
      Species: { isRepeatingFraction: false, isSquareRoot: false },
      Latitude: { isRepeatingFraction: false, isSquareRoot: false },
      Longitude: { isRepeatingFraction: false, isSquareRoot: false },
      "Research years": { isRepeatingFraction: false, isSquareRoot: false },
      BSCooMean: { isRepeatingFraction: true, isSquareRoot: false },
      BSCooSD: { isRepeatingFraction: false, isSquareRoot: true },
      CooCombinedSD: { isRepeatingFraction: false, isSquareRoot: false },
      BSCoon: { isRepeatingFraction: false, isSquareRoot: false },
      BSNonCooMean: { isRepeatingFraction: true, isSquareRoot: false },
      BSNonCooSD: { isRepeatingFraction: false, isSquareRoot: true },
      NonCooCombinedSD: { isRepeatingFraction: false, isSquareRoot: false },
      BSNonCoon: { isRepeatingFraction: false, isSquareRoot: false },
      Data_Validity: { isRepeatingFraction: false, isSquareRoot: false },
      References: { isRepeatingFraction: false, isSquareRoot: false },
    };

    expect(columnAttributesByName).toEqual(expectedColumnAttributesByName);
  });
});
