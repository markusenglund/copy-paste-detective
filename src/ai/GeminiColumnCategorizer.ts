import {
  CategorizeColumnsFunction,
  ColumnCategorizationParams,
  ColumnCategorization
} from "./ColumnCategorizer";
import { categorizeColumns as geminiCategorizeColumns } from "./geminiService";

export const categorizeColumnsWithGemini: CategorizeColumnsFunction = async ({
  sheet,
  context,
  dataDescription
}: ColumnCategorizationParams): Promise<ColumnCategorization> => {
  // Extract column names and sample data for Gemini
  const columnNames = (sheet.enhancedMatrix[0] || []).map(cell =>
    String(cell.value || "")
  );
  const sampleData = sheet.enhancedMatrix
    .slice(1, 3)
    .map(row => row.map(cell => String(cell.value || "")));

  const columnCategorization = await geminiCategorizeColumns({
    paperName: context.articleName,
    excelFileName: context.excelFileName,
    dataDescription,
    columnNames,
    columnData: sampleData
  });

  console.log(
    `[${sheet.name}] Unique columns:`,
    columnCategorization.unique.join(", ")
  );
  console.log(
    `[${sheet.name}] Shared columns:`,
    columnCategorization.shared.join(", ")
  );

  return columnCategorization;
};