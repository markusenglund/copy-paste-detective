import { Sheet } from "../entities/Sheet";
import { ExcelFileData } from "../types/ExcelFileData";

export interface ColumnCategorizationParams {
  sheet: Sheet;
  excelFileData: ExcelFileData;
}

export interface ColumnCategorization {
  unique: string[];
  shared: string[];
  motivation: string;
}

export type CategorizeColumnsFunction = (
  params: ColumnCategorizationParams
) => Promise<ColumnCategorization>;
