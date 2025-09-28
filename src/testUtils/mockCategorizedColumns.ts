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
    sheets: [sheet],
    excelFileName: "mockedFile.xlsx",
    articleName: "Mocked Article",
    dataDescription: "This is a mocked Excel file data for testing purposes.",
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
