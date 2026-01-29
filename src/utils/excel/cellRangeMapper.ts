import { RepeatedColumnSequence } from "../../entities/RepeatedColumnSequence";
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
  comment?: string;
  isFirstInSequence: boolean;
}

/**
 * Maps repeated column sequences to styled cell ranges ready for Excel highlighting.
 * Groups sequences by sheet and assigns colors to matching sequences.
 */
export function mapSequencesToCellRanges(
  sequences: RepeatedColumnSequence[],
  usedColors: Set<string> = new Set(),
): StyledCellRange[] {
  const cellRanges: StyledCellRange[] = [];
  const styledCells = new Set<string>(); // Track already-styled cells to detect overlaps

  sequences.forEach((sequence, sequenceIndex) => {
    // Find a color that hasn't been used by other strategies
    let color = getColorForSequenceIndex(sequenceIndex);
    let colorOffset = 0;
    const maxAttempts = 100; // Prevent infinite loop
    while (usedColors.has(color) && colorOffset < maxAttempts) {
      colorOffset++;
      color = getColorForSequenceIndex(sequenceIndex + colorOffset * 10);
    }
    usedColors.add(color);

    // Create comment text with all matching sequence locations
    const comment = generateSequenceComment(sequence);

    // Process each sequence occurrence (usually 2, but can be more after deduplication)
    sequence.sequences.forEach((seq, occurrenceIndex) => {
      const columnIndex = seq.column.index;
      const startRowIndex = seq.startRowIndex;
      const endRowIndex = startRowIndex + sequence.values.length - 1;

      // Check for overlapping cells
      for (let row = startRowIndex; row <= endRowIndex; row++) {
        const cellKey = `${sequence.sheetName}-${columnIndex}-${row}`;
        if (styledCells.has(cellKey)) {
          console.warn(
            `Warning: Overlapping highlight at ${sequence.sheetName} column ${seq.column.id} row ${row + 1}. Keeping first style.`,
          );
          return; // Skip this occurrence to avoid overwriting existing style
        }
      }

      // Mark cells as styled
      for (let row = startRowIndex; row <= endRowIndex; row++) {
        styledCells.add(`${sequence.sheetName}-${columnIndex}-${row}`);
      }

      cellRanges.push({
        sheetName: sequence.sheetName,
        columnIndex,
        startRowIndex,
        endRowIndex,
        color,
        comment: occurrenceIndex === 0 ? comment : undefined, // Only add comment to first occurrence
        isFirstInSequence: occurrenceIndex === 0,
      });
    });
  });

  return cellRanges;
}

/**
 * Generate comment text for a sequence showing all matching locations
 */
function generateSequenceComment(sequence: RepeatedColumnSequence): string {
  const firstValue = sequence.values[0];
  const lastValue = sequence.values[sequence.values.length - 1];
  const length = sequence.values.length;
  const score = sequence.matrixSizeAdjustedEntropyScore.toFixed(2);

  const locations = sequence.sequences.map((seq, idx) => {
    const columnId = seq.column.id;
    const startRow = seq.startRowIndex + 1; // Convert to 1-indexed
    const endRow = seq.startRowIndex + length;
    const startCell = `${columnId}${startRow}`;
    const endCell = `${columnId}${endRow}`;
    return `${idx + 1}. Column ${seq.column.name || columnId} rows ${startRow}-${endRow} (cells ${startCell}-${endCell})`;
  });

  return `Duplicate sequence detected!

Matching sequences:
${locations.join("\n")}

Sequence values: ${firstValue} -> ${lastValue} (length: ${length})
Suspicion score: ${score}`;
}

/**
 * Get colors already used in existing highlighted file.
 * Used to avoid color conflicts when multiple strategies write to same file.
 */
export function getUsedColorsFromWorkbook(
  workbook: { Sheets?: Record<string, unknown> } | undefined,
): Set<string> {
  const usedColors = new Set<string>();

  if (!workbook || !workbook.Sheets) {
    return usedColors;
  }

  Object.values(workbook.Sheets).forEach((sheet: unknown) => {
    if (typeof sheet !== "object" || !sheet) return;

    Object.keys(sheet).forEach((cellAddress) => {
      // Skip special keys like !ref, !margins
      if (cellAddress.startsWith("!")) return;

      const cell = (sheet as Record<string, unknown>)[cellAddress];
      if (
        cell &&
        typeof cell === "object" &&
        "s" in cell &&
        cell.s &&
        typeof cell.s === "object" &&
        "fill" in cell.s &&
        cell.s.fill &&
        typeof cell.s.fill === "object" &&
        "fgColor" in cell.s.fill &&
        cell.s.fill.fgColor &&
        typeof cell.s.fill.fgColor === "object" &&
        "rgb" in cell.s.fill.fgColor &&
        typeof cell.s.fill.fgColor.rgb === "string"
      ) {
        usedColors.add(cell.s.fill.fgColor.rgb);
      }
    });
  });

  return usedColors;
}
