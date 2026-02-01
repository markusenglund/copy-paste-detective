import fs from "fs";
import ExcelJS from "exceljs";
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
  // Pick existing highlighted file as base if it exists or the original if it doesn't.
  const baseFilePath = fs.existsSync(outputFilePath)
    ? outputFilePath
    : originalFilePath;

  if (baseFilePath === originalFilePath) {
    // Copy original to output location if highlighted file doesn't exist
    logger.info(
      `Creating new highlighted file from original: ${outputFilePath}`,
    );
    fs.copyFileSync(originalFilePath, outputFilePath);
  } else {
    logger.info(`Using existing highlighted file as base: ${outputFilePath}`);
  }

  logger.debug(`Reading workbook from: ${outputFilePath}`);
  // Read the base workbook with ExcelJS (automatically preserves styles)
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(outputFilePath);
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
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      logger.warn(
        `Sheet "${sheetName}" not found in workbook, skipping highlights`,
      );
      return;
    }

    logger.debug(`Applying ${ranges.length} highlights to sheet: ${sheetName}`);
    applyStylesToSheet(worksheet, ranges);
  });

  logger.debug(`Writing workbook to: ${outputFilePath}`);
  // Write the styled workbook back to file
  await workbook.xlsx.writeFile(outputFilePath);
  logger.info(`Highlighted file saved to: ${outputFilePath}`);
}

/**
 * Apply highlighting styles to a single sheet.
 */
function applyStylesToSheet(
  worksheet: ExcelJS.Worksheet,
  ranges: StyledCellRange[],
): void {
  ranges.forEach((range) => {
    const { columnIndex, startRowIndex, endRowIndex, color } = range;

    // Apply styles to each cell in the range
    // Note: StyledCellRange uses 0-based indexing, ExcelJS uses 1-based
    for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex++) {
      const cell = worksheet.getCell(rowIndex + 1, columnIndex + 1);

      // Skip empty cells
      if (cell.value === null || cell.value === undefined) {
        continue;
      }
      // Apply borders (creates box around sequence)
      const isFirstRow = rowIndex === startRowIndex;
      const isLastRow = rowIndex === endRowIndex;

      // Apply background color and borders to a completely new style object.
      // exceljs uses the same style object for many cells so mutating it directly causes unrelated cells to have their styles changed.
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
      }
    }
  });
}
