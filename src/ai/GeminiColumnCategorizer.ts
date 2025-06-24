import {
  CategorizeColumnsFunction,
  ColumnCategorizationParams,
  ColumnCategorization,
} from "./ColumnCategorizer";
import { categorizeColumns as geminiCategorizeColumns } from "./geminiService";

export const categorizeColumnsWithGemini: CategorizeColumnsFunction = async ({
  sheet,
  excelFileData,
}: ColumnCategorizationParams): Promise<ColumnCategorization> => {
  const columnNames = sheet.columnNames;
  const sampleData = sheet.enhancedMatrix
    .slice(sheet.firstDataRowIndex, sheet.firstDataRowIndex + 2)
    .map((row) => row.map((cell) => String(cell.value || "")));

  const columnCategorization = await geminiCategorizeColumns({
    paperName: excelFileData.articleName,
    excelFileName: excelFileData.excelFileName,
    readmeContent: excelFileData.readmeContent,
    columnNames,
    columnData: sampleData,
  });

  console.log(`[${sheet.name}] Unique columns:`, columnCategorization.unique);
  console.log(`[${sheet.name}] Shared columns:`, columnCategorization.shared);
  console.log(`[${sheet.name}] motivation:`, columnCategorization.motivation);

  return columnCategorization;
};
