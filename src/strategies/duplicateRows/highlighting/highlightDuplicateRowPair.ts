import ExcelJS from "exceljs";
import { DuplicateRow } from "../../../entities/DuplicateRow";
import { SEQUENCE_BORDER_STYLE } from "../../../utils/excel/styleConstants";

/**
 * Highlights a single duplicate row pair in an Excel worksheet.
 * Applies color and borders to shared cells in both rows.
 *
 * @param worksheet - The ExcelJS worksheet to modify
 * @param duplicateRow - The duplicate row pair to highlight
 * @param color - Color to apply (hex without FF prefix)
 * @param styledCells - Set of already-styled cells for overlap detection
 * @returns true if highlighted successfully, false if skipped due to overlap
 */
export function highlightDuplicateRowPair(
  worksheet: ExcelJS.Worksheet,
  duplicateRow: DuplicateRow,
  color: string,
  styledCells: Set<string>,
): boolean {
  const [row1Index, row2Index] = duplicateRow.rowIndices;
  const sharedColumnIndices = duplicateRow.sharedColumns;
  const sheetName = duplicateRow.sheet.name;

  // Check for overlaps first (before modifying anything)
  for (const colIndex of sharedColumnIndices) {
    const cell1Key = `${sheetName}-${colIndex}-${row1Index}`;
    const cell2Key = `${sheetName}-${colIndex}-${row2Index}`;
    if (styledCells.has(cell1Key) || styledCells.has(cell2Key)) {
      return false; // Skip this pair
    }
  }

  // Highlight row 1
  highlightRowCells(
    worksheet,
    row1Index,
    sharedColumnIndices,
    color,
    styledCells,
    sheetName,
  );

  // Highlight row 2
  highlightRowCells(
    worksheet,
    row2Index,
    sharedColumnIndices,
    color,
    styledCells,
    sheetName,
  );

  // Add comments if rows are far apart (>50 rows)
  const rowDistance = Math.abs(row2Index - row1Index);
  if (rowDistance > 50) {
    const row1DisplayNum = row1Index + 1;
    const row2DisplayNum = row2Index + 1;
    const commentText = `Row ${row1DisplayNum} <-> Row ${row2DisplayNum}`;

    addRowPairComment(worksheet, row1Index, sharedColumnIndices, commentText);
    addRowPairComment(worksheet, row2Index, sharedColumnIndices, commentText);
  }

  return true;
}

/**
 * Helper function to highlight cells in a single row.
 */
function highlightRowCells(
  worksheet: ExcelJS.Worksheet,
  rowIndex: number,
  columnIndices: number[],
  color: string,
  styledCells: Set<string>,
  sheetName: string,
): void {
  for (const colIndex of columnIndices) {
    const cell = worksheet.getCell(rowIndex + 1, colIndex + 1); // Convert to 1-based

    // Skip empty cells
    if (cell.value === null || cell.value === undefined) {
      continue;
    }

    // Apply color and border
    cell.style = {
      ...cell.style,
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + color },
      },
      border: {
        top: SEQUENCE_BORDER_STYLE.top,
        bottom: SEQUENCE_BORDER_STYLE.bottom,
      },
    };

    // Mark as styled
    styledCells.add(`${sheetName}-${colIndex}-${rowIndex}`);
  }
}

/**
 * Helper function to add a comment to the first shared cell in a row.
 */
function addRowPairComment(
  worksheet: ExcelJS.Worksheet,
  rowIndex: number,
  columnIndices: number[],
  commentText: string,
): void {
  if (columnIndices.length === 0) return;

  const firstColIndex = columnIndices[0];
  const cell = worksheet.getCell(rowIndex + 1, firstColIndex + 1);
  const comment: ExcelJS.Comment = {
    texts: [{ text: commentText }],
  };
  cell.note = comment;
}
