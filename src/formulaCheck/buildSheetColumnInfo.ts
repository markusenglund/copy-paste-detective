import xlsx from "xlsx";
import type { Sheet } from "../entities/Sheet";
import type { SheetColumnInfo } from "./checkRelationship";

const FORMULA_COLUMN_THRESHOLD = 0.5;

export function buildSheetColumnInfo(sheet: Sheet): SheetColumnInfo[] {
  return sheet.columnNames.map((columnName, colIndex) => {
    let nonEmptyCount = 0;
    let formulaCount = 0;
    for (
      let rowIndex = sheet.firstDataRowIndex;
      rowIndex < sheet.numRows;
      rowIndex++
    ) {
      const cell = sheet.enhancedMatrix[rowIndex]?.[colIndex];
      const value = cell?.value;
      if (value == null || (typeof value === "string" && value.trim() === "")) {
        continue;
      }
      nonEmptyCount++;
      if (cell.originalCell?.f !== undefined) {
        formulaCount++;
      }
    }

    const ratio = nonEmptyCount === 0 ? 0 : formulaCount / nonEmptyCount;
    return {
      letter: xlsx.utils.encode_col(colIndex),
      name: columnName,
      isFormula: ratio > FORMULA_COLUMN_THRESHOLD,
    };
  });
}
