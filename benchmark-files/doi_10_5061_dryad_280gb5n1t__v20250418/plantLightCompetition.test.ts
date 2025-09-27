import { describe, it, expect, beforeAll } from "@jest/globals";

import { loadExcelFileFromFolder } from "../../src/utils/loadExcelFileFromFolder";

import { ExcelFileData } from "../../src/types/ExcelFileData";
import { Sheet } from "../../src/entities/Sheet";
import { categorizeColumns } from "../../src/columnCategorization/columnCategorization";

describe("Plant responses to light competition", () => {
  let sheet: Sheet;

  beforeAll(() => {
    const datasetFolder =
      "benchmark-files/doi_10_5061_dryad_280gb5n1t__v20250418";
    const excelFileData: ExcelFileData = loadExcelFileFromFolder(datasetFolder);
    sheet = excelFileData.sheets[0];
  });

  it("correctly categorizes columns with repeating fractions", () => {
    const columnCategorization = categorizeColumns(sheet);
    const columnAttributesByName = Object.fromEntries(
      columnCategorization.map((cat) => [
        cat.column.combinedColumnName,
        cat.attributes,
      ]),
    );
    const expectedIsRepeatingFractionByColumnName = {
      "Plant ID": { isRepeatingFraction: false, isSquareRoot: false },
      Block: { isRepeatingFraction: false, isSquareRoot: false },
      Population: { isRepeatingFraction: false, isSquareRoot: false },
      "Annual precipitation": {
        isRepeatingFraction: false,
        isSquareRoot: false,
      },
      "Neighbor height": { isRepeatingFraction: false, isSquareRoot: false },
      "Neighbor density": { isRepeatingFraction: false, isSquareRoot: false },
      "height:diameter ratio": {
        isRepeatingFraction: true,
        isSquareRoot: false,
      },
      "Leaf angle": { isRepeatingFraction: true, isSquareRoot: false },
      "Branching intensity": { isRepeatingFraction: true, isSquareRoot: false },
      "Stem-base diameter": { isRepeatingFraction: false, isSquareRoot: false },
      "Internode length": { isRepeatingFraction: false, isSquareRoot: false },
      SLA: { isRepeatingFraction: false, isSquareRoot: false },
      "Leaf area": { isRepeatingFraction: false, isSquareRoot: false },
      Amax: { isRepeatingFraction: false, isSquareRoot: false },
      Aqe: { isRepeatingFraction: false, isSquareRoot: false },
      LCP: { isRepeatingFraction: false, isSquareRoot: false },
      "Shoot mass": { isRepeatingFraction: false, isSquareRoot: false },
      "inflorescence number": {
        isRepeatingFraction: false,
        isSquareRoot: false,
      },
    };

    expect(columnAttributesByName).toEqual(
      expectedIsRepeatingFractionByColumnName,
    );
  });
});
