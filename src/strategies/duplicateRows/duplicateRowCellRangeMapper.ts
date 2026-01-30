import { DuplicateRow } from "../../entities/DuplicateRow";
import { StyledCellRange } from "../../utils/excel/cellRangeMapper";
import { logger } from "../../utils/logger";
import { getColorForSequenceIndex } from "../../utils/excel/styleConstants";

/**
 * Maps duplicate rows to styled cell ranges ready for Excel highlighting.
 * Each duplicate row pair gets a unique color, applied to the specific shared cells in both rows.
 */
export function mapDuplicateRowsToCellRanges(
  duplicateRows: DuplicateRow[],
): StyledCellRange[] {
  const cellRanges: StyledCellRange[] = [];
  const styledCells = new Set<string>(); // Track already-styled cells to detect overlaps
  let skippedPairs = 0;

  duplicateRows.forEach((duplicateRow, i) => {
    const color = getColorForSequenceIndex(i);
    const sheetName = duplicateRow.sheet.name;
    const [row1Index, row2Index] = duplicateRow.rowIndices;

    // Check if any cells in this pair would overlap with existing styled cells
    let hasOverlap = false;
    for (const columnIndex of duplicateRow.sharedColumns) {
      const cell1Key = `${sheetName}-${columnIndex}-${row1Index}`;
      const cell2Key = `${sheetName}-${columnIndex}-${row2Index}`;
      if (styledCells.has(cell1Key) || styledCells.has(cell2Key)) {
        hasOverlap = true;
        break;
      }
    }

    // Skip entire pair if any cells overlap
    if (hasOverlap) {
      skippedPairs++;
      return;
    }

    // Process each shared column - create cell ranges for both rows
    for (const columnIndex of duplicateRow.sharedColumns) {
      // Mark cells as styled
      styledCells.add(`${sheetName}-${columnIndex}-${row1Index}`);
      styledCells.add(`${sheetName}-${columnIndex}-${row2Index}`);

      // Create cell range for first row (single cell: start == end)
      cellRanges.push({
        sheetName,
        columnIndex,
        startRowIndex: row1Index,
        endRowIndex: row1Index,
        color,
      });

      // Create cell range for second row (single cell: start == end)
      cellRanges.push({
        sheetName,
        columnIndex,
        startRowIndex: row2Index,
        endRowIndex: row2Index,
        color,
      });
    }
  });

  if (skippedPairs > 0) {
    logger.warn(
      `Skipped ${skippedPairs} duplicate row pairs out of ${duplicateRows.length} due to overlapping highlights`,
    );
  }

  return cellRanges;
}
