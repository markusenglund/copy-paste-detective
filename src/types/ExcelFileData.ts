import { Sheet } from "../entities/Sheet";

export interface ExcelFileData {
  sheets: Sheet[];
  excelFileName: string;
  articleName: string;
  abstract?: string;
  dataDescription: string;
  extId?: string;
}
