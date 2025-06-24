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

  // Enforce that each column name is unique, even if the input had multiple columns with the same name
  const parsedColumnCategorization = {
    ...columnCategorization,
    unique: [...new Set(columnCategorization.unique)],
  };

  console.log(
    `[${sheet.name}] Unique columns:`,
    parsedColumnCategorization.unique,
  );
  console.log(
    `[${sheet.name}] Shared columns:`,
    parsedColumnCategorization.shared,
  );
  console.log(
    `[${sheet.name}] motivation:`,
    parsedColumnCategorization.motivation,
  );

  return parsedColumnCategorization;
};
