import { describe, it, expect, beforeAll } from "@jest/globals";

import { loadExcelFileFromFolder } from "../../src/utils/loadExcelFileFromFolder";

import { ExcelFileData } from "../../src/types/ExcelFileData";
import { Sheet } from "../../src/entities/Sheet";
import { categorizeColumns } from "../../src/columnCategorization/columnCategorization";
import { pick } from "lodash-es";

describe("Parental control plasticity", () => {
  let sheet: Sheet;
  let excelFileData: ExcelFileData;

  beforeAll(() => {
    const datasetFolder = "benchmark-files/158552";
    excelFileData = loadExcelFileFromFolder(datasetFolder);
    sheet = excelFileData.sheets[0];
  });

  it("correctly categorizes columns", async () => {
    const categorizedColumns = await categorizeColumns(sheet, excelFileData, {
      excludeAiProfile: true,
    });
    const columnAttributesByName = Object.fromEntries(
      categorizedColumns
        .slice(31) // Only get columns after 30 since those are the interesting ones
        .map((col) => [
          col.name,
          pick(col, ["isRepeatingFraction", "isSquareRoot", "isLnArgument"]),
        ]),
    );
    const expectedIsRepeatingFractionByColumnName = {
      "relative.beg.fed.chick.no.zero": {
        isRepeatingFraction: true,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "mean.beg.brood.no.zero": {
        isRepeatingFraction: true,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "mean.beg.brood.with.zero": {
        isRepeatingFraction: true,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "max.beg.brood": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "total.brood.beg": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "number.chicks.begging.higher": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "relative.beg.fed.chick.with.zero": {
        isRepeatingFraction: true,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "fed.chick.beg.rank": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "fed.chick.weight.rank": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "fed.chick.relative.weight": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "film.brood.mean.weight": {
        isRepeatingFraction: true,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "film.brood.sd.weight": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "sd.brood.beg.with.zero": {
        isRepeatingFraction: false,
        isSquareRoot: true,
        isLnArgument: false,
      },
      "sd.brood.beg.no.zero": {
        isRepeatingFraction: false,
        isSquareRoot: true,
        isLnArgument: false,
      },
      "unknown.id.chickx1.beg": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "unknown.id.chickx2.beg": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "unknown.id.chickx3.beg": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "unknown.id.chickx4.beg": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "unknown.id.chickx5.beg": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "unknown.id.chickx6.beg": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
      "unknown.id.chickx7.beg": {
        isRepeatingFraction: false,
        isSquareRoot: false,
        isLnArgument: false,
      },
    };

    expect(columnAttributesByName).toEqual(
      expectedIsRepeatingFractionByColumnName,
    );
  });
});
