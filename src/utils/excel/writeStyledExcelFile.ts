import fs from "fs";
import xlsx from "xlsx";
import xlsxStyle from "xlsx-js-style";
import { StyledCellRange } from "./cellRangeMapper";
import { SEQUENCE_BORDER_STYLE } from "./styleConstants";
import { logger } from "../logger";

/**
 * Write styled Excel file with highlights for repeated sequences.
 * If output file already exists, uses it as base to preserve existing highlights.
 * Otherwise, copies original file to output location first.
 *
 * @param originalFilePath - Path to original Excel file
 * @param outputFilePath - Path where highlighted file should be written
 * @param cellRanges - Cell ranges to highlight with colors and borders
 */
export async function writeStyledExcelFile(
  originalFilePath: string,
  outputFilePath: string,
  cellRanges: StyledCellRange[],
): Promise<void> {
  try {
    // Determine base file (existing highlighted file or original)
    const baseFilePath = fs.existsSync(outputFilePath)
      ? outputFilePath
      : originalFilePath;

    if (baseFilePath === originalFilePath) {
      // Copy original to output location if highlighted file doesn't exist
      logger.debug(
        `Creating new highlighted file from original: ${outputFilePath}`,
      );
      fs.copyFileSync(originalFilePath, outputFilePath);
    } else {
      logger.debug(
        `Using existing highlighted file as base: ${outputFilePath}`,
      );
    }

    logger.debug(`Reading workbook from: ${outputFilePath}`);
    // Read the base workbook with xlsx-js-style (preserves styles)
    const workbook = xlsxStyle.readFile(outputFilePath);
    logger.debug(`Workbook read successfully`);

    // Group cell ranges by sheet for efficient processing
    const rangesBySheet = new Map<string, StyledCellRange[]>();
    cellRanges.forEach((range) => {
      const existing = rangesBySheet.get(range.sheetName) || [];
      existing.push(range);
      rangesBySheet.set(range.sheetName, existing);
    });

    // Apply styles to each sheet
    rangesBySheet.forEach((ranges, sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        logger.warn(
          `Sheet "${sheetName}" not found in workbook, skipping highlights`,
        );
        return;
      }

      logger.debug(
        `Applying ${ranges.length} highlights to sheet: ${sheetName}`,
      );
      applyStylesToSheet(sheet, ranges);
    });

    logger.debug(`Writing workbook to: ${outputFilePath}`);
    // Write the styled workbook back to file
    xlsxStyle.writeFile(workbook, outputFilePath);
    logger.info(`Highlighted file saved to: ${outputFilePath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to write styled Excel file: ${message}`);
    throw error;
  }
}

/**
 * Apply highlighting styles to a single sheet.
 */
function applyStylesToSheet(
  sheet: Record<string, unknown>,
  ranges: StyledCellRange[],
): void {
  ranges.forEach((range) => {
    const {
      columnIndex,
      startRowIndex,
      endRowIndex,
      color,
      comment,
      isFirstInSequence,
    } = range;

    // Apply styles to each cell in the range
    for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex++) {
      const cellAddress = xlsx.utils.encode_cell({
        r: rowIndex,
        c: columnIndex,
      });
      const cell = sheet[cellAddress] as
        | {
            s?: Record<string, unknown>;
            c?: Array<{ a: string; t: string }>;
          }
        | undefined;

      if (!cell) {
        // Cell doesn't exist (empty cell), skip it
        continue;
      }

      // Initialize cell style if not present
      if (!cell.s) {
        cell.s = {};
      }

      // Apply background color
      cell.s.fill = {
        fgColor: { rgb: color },
        patternType: "solid",
      };

      // Apply borders (creates box around sequence)
      const isFirstRow = rowIndex === startRowIndex;
      const isLastRow = rowIndex === endRowIndex;

      cell.s.border = {
        left: SEQUENCE_BORDER_STYLE.left,
        right: SEQUENCE_BORDER_STYLE.right,
        ...(isFirstRow && { top: SEQUENCE_BORDER_STYLE.top }),
        ...(isLastRow && { bottom: SEQUENCE_BORDER_STYLE.bottom }),
      };

      // Add comment to first cell of first sequence occurrence
      if (isFirstInSequence && rowIndex === startRowIndex && comment) {
        // xlsx-js-style supports comments via the 'c' property
        cell.c = cell.c || [];
        cell.c.push({
          a: "Fraud Detector",
          t: comment,
        });
      }
    }
  });
}
