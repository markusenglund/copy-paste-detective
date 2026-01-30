import { RepeatedColumnSequence } from "../../entities/RepeatedColumnSequence";
import { logger } from "../logger";
import { getColorForSequenceIndex } from "./styleConstants";

/**
 * Represents a styled cell range in an Excel sheet
 */
export interface StyledCellRange {
  sheetName: string;
  columnIndex: number;
  startRowIndex: number;
  endRowIndex: number;
  color: string;
}

/**
 * Maps repeated column sequences to styled cell ranges ready for Excel highlighting.
 * Groups sequences by sheet and assigns colors to matching sequences.
 */
export function mapSequencesToCellRanges(
  sequences: RepeatedColumnSequence[],
): StyledCellRange[] {
  const cellRanges: StyledCellRange[] = [];
  const styledCells = new Set<string>(); // Track already-styled cells to detect overlaps
  let skippedSequences = 0;
  sequences.forEach((repeatedSequence, i) => {
    const color = getColorForSequenceIndex(i);

    // Process each sequence occurrence (usually 2, but can be more after deduplication)
    for (const sequence of repeatedSequence.sequences) {
      const columnIndex = sequence.column.index;
      const startRowIndex = sequence.startRowIndex;
      const endRowIndex = startRowIndex + repeatedSequence.values.length - 1;

      // Check for overlapping cells
      for (let row = startRowIndex; row <= endRowIndex; row++) {
        const cellKey = `${repeatedSequence.sheetName}-${columnIndex}-${row}`;
        if (styledCells.has(cellKey)) {
          skippedSequences++;
          return; // Skip entire sequence to avoid overwriting existing style
        }
      }

      // Mark cells as styled
      for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex++) {
        styledCells.add(`${repeatedSequence.sheetName}-${columnIndex}-${rowIndex}`);
      }

      cellRanges.push({
        sheetName: repeatedSequence.sheetName,
        columnIndex,
        startRowIndex,
        endRowIndex,
        color,
      });
    }
  });
  if (skippedSequences > 0) {
    logger.warn(`Skipped ${skippedSequences} sequences out of ${sequences.length} due to overlapping highlights`);
  }

  return cellRanges;
}
