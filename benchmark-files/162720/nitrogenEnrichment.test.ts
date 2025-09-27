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
      columnCategorization
        .slice(0, 20) // Only get the first 20 columns for brevity
        .map((cat) => [cat.column.combinedColumnName, cat.attributes]),
    );
    const expectedIsRepeatingFractionByColumnName = {
      SampleID: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      Treat: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      Block: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      Lev: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      ZLev1: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      ZLev: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      PH: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: true,
      },
      SM: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: true,
      },
      TIN: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: true,
      },
      SOC: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      TSN: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: true,
      },
      TSP: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      CTN: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      CTP: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      NTP: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      Plant_Rich: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: true,
      },
      AB_Rich: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: true,
      },
      PB_Rich: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: true,
      },
      PF_Rich: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: true,
      },
      PR_Rich: {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: true,
      },
    };

    console.log(columnAttributesByName);
    expect(columnAttributesByName).toEqual(
      expectedIsRepeatingFractionByColumnName,
    );
  });
});
