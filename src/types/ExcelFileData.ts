import { Sheet } from "../entities/Sheet";

export interface ExcelFileData {
  sheets: Sheet[];
  excelFileName: string;
  articleName: string;
  readmeContent: string;
  excelDataFolder: string;
}