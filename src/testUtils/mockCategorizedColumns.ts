import {
  categorizeColumns,
  CategorizedColumn,
} from "../columnCategorization/columnCategorization";
import { Sheet } from "../entities/Sheet";
import { ExcelFileData } from "../types/ExcelFileData";

export async function mockCategorizedColumns(
  sheet: Sheet,
  includedColumnNames: Set<string>,
): Promise<CategorizedColumn[]> {
  const mockExcelFileData: ExcelFileData = {
    source: "standalone",
    sheets: [sheet],
    excelFileName: "mockedFile.xlsx",
    articleName: "Mocked Article",
  };

  const categorizedColumns = (
    await categorizeColumns(sheet, mockExcelFileData, {
      excludeAiProfile: true,
    })
  ).map((column) => ({
    ...column,
    isIncludedInAnalysis: includedColumnNames.has(column.name) || false,
  }));
  return categorizedColumns;
}
