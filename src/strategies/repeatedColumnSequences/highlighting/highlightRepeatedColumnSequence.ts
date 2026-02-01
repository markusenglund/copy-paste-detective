import ExcelJS from "exceljs";
import {
  RepeatedColumnSequence,
  ColumnSequence,
} from "../../../entities/RepeatedColumnSequence";
import { SEQUENCE_BORDER_STYLE } from "../../../utils/excel/styleConstants";

/**
 * Highlights a single repeated column sequence in an Excel worksheet.
 * Applies color and borders to all occurrences of the sequence.
 *
 * @param worksheet - The ExcelJS worksheet to modify
 * @param repeatedSequence - The repeated sequence to highlight
 * @param color - Color to apply (hex without FF prefix)
 * @param styledCells - Set of already-styled cells for overlap detection
 * @returns true if highlighted successfully, false if skipped due to overlap
 */
export function highlightRepeatedColumnSequence(
  worksheet: ExcelJS.Worksheet,
  repeatedSequence: RepeatedColumnSequence,
  color: string,
  styledCells: Set<string>,
): boolean {
  const sequenceLength = repeatedSequence.values.length;
  const sheetName = repeatedSequence.sheetName;

  // Check for overlaps first across all occurrences
  for (const sequence of repeatedSequence.sequences) {
    const colIndex = sequence.column.index;
    const startRow = sequence.startRowIndex;
    const endRow = startRow + sequenceLength - 1;

    for (let row = startRow; row <= endRow; row++) {
      const cellKey = `${sheetName}-${colIndex}-${row}`;
      if (styledCells.has(cellKey)) {
        return false; // Skip entire sequence
      }
    }
  }

  // Highlight all occurrences
  for (const sequence of repeatedSequence.sequences) {
    highlightColumnSequenceOccurrence(
      worksheet,
      sequence,
      sequenceLength,
      color,
      styledCells,
      sheetName,
    );
  }

  // FUTURE: Add comment to each occurrence here

  return true;
}

/**
 * Helper function to highlight a single occurrence of a column sequence.
 */
function highlightColumnSequenceOccurrence(
  worksheet: ExcelJS.Worksheet,
  sequence: ColumnSequence,
  sequenceLength: number,
  color: string,
  styledCells: Set<string>,
  sheetName: string,
): void {
  const colIndex = sequence.column.index;
  const startRow = sequence.startRowIndex;
  const endRow = startRow + sequenceLength - 1;

  for (let row = startRow; row <= endRow; row++) {
    const cell = worksheet.getCell(row + 1, colIndex + 1); // Convert to 1-based

    // Skip empty cells
    if (cell.value === null || cell.value === undefined) {
      continue;
    }

    const isFirstRow = row === startRow;
    const isLastRow = row === endRow;

    // Apply color and borders
    cell.style = {
      ...cell.style,
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + color },
      },
      border: {
        left: SEQUENCE_BORDER_STYLE.left,
        right: SEQUENCE_BORDER_STYLE.right,
        ...(isFirstRow && { top: SEQUENCE_BORDER_STYLE.top }),
        ...(isLastRow && { bottom: SEQUENCE_BORDER_STYLE.bottom }),
      },
    };

    // Mark as styled
    styledCells.add(`${sheetName}-${colIndex}-${row}`);
  }
}
