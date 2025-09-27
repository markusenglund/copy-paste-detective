import { describe, it, expect, beforeAll } from "@jest/globals";

import { loadExcelFileFromFolder } from "../../src/utils/loadExcelFileFromFolder";

import { ExcelFileData } from "../../src/types/ExcelFileData";
import { Sheet } from "../../src/entities/Sheet";
import { categorizeColumns } from "../../src/columnCategorization/columnCategorization";

describe("Plant responses to light competition", () => {
  let sheet: Sheet;

  beforeAll(() => {
    const datasetFolder = "benchmark-files/162720";
    const excelFileData: ExcelFileData = loadExcelFileFromFolder(datasetFolder);
    sheet = excelFileData.sheets[0];
  });

  it("correctly categorizes columns", () => {
    const columnCategorization = categorizeColumns(sheet);
    const columnAttributesByName = Object.fromEntries(
      columnCategorization.map((cat) => [
        cat.column.combinedColumnName,
        cat.attributes,
      ]),
    );
    const expectedIsRepeatingFractionByColumnName = {};

    expect(columnAttributesByName).toEqual(
      expectedIsRepeatingFractionByColumnName,
    );
  });
});
