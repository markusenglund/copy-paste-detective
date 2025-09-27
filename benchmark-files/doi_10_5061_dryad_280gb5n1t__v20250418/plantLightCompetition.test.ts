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
    const isRepeatingFractionByColumnName = Object.fromEntries(
      columnCategorization.map((cat) => [
        cat.column.combinedColumnName,
        cat.attributes.isRepeatingFraction,
      ]),
    );
    const expectedIsRepeatingFractionByColumnName = {
      "Plant ID": false,
      Block: false,
      Population: false,
      "Annual precipitation": false,
      "Neighbor height": false,
      "Neighbor density": false,
      "height:diameter ratio": true,
      "Leaf angle": true,
      "Branching intensity": true,
      "Stem-base diameter": false,
      "Internode length": false,
      SLA: false,
      "Leaf area": false,
      Amax: false,
      Aqe: false,
      LCP: false,
      "Shoot mass": false,
      "inflorescence number": false,
    };
    expect(isRepeatingFractionByColumnName).toEqual(
      expectedIsRepeatingFractionByColumnName,
    );
  });
});
