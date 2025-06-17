import { Sheet } from "../entities/Sheet";
import { Metadata } from "./metadata";

export interface ExcelFileData {
  sheets: Sheet[];
  excelFileName: string;
  articleName: string;
  readmeContent: string;
  metadata: Metadata;
  excelDataFolder: string;
}