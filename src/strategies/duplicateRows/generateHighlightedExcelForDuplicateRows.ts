import { ExcelFileData } from "../../types/ExcelFileData";
import { DuplicateRow } from "../../entities/DuplicateRow";
import { getHighlightedOutputPath } from "../../utils/paths/getHighlightedOutputPath";
import { logger } from "../../utils/logger";
import { loadWorkbookForHighlighting } from "../../utils/excel/loadWorkbookForHighlighting";
import { highlightDuplicateRowPair } from "./highlighting/highlightDuplicateRowPair";
import { getColorForSequenceIndex } from "../../utils/excel/styleConstants";

/**
 * Generate highlighted Excel file with duplicate rows marked with colors and borders.
 * Only the specific shared cells between duplicate row pairs are colored.
 *
 * @param excelFileData - Excel file metadata including extId and filename
 * @param originalFilePath - Path to original Excel file
 * @param duplicateRows - Detected duplicate rows to highlight
 * @returns Path to generated highlighted file, or null if generation failed
 */
export async function generateHighlightedExcelForDuplicateRows(
  excelFileData: ExcelFileData,
  originalFilePath: string,
  duplicateRows: DuplicateRow[],
): Promise<string | null> {
  if (duplicateRows.length === 0) {
    logger.warn("No duplicate rows to highlight, skipping Excel generation");
    return null;
  }

  logger.info(
    `[${excelFileData.extId}] Generating highlighted Excel file for duplicate rows in '${excelFileData.excelFileName}'`,
  );

  // Generate output path
  const outputPath = getHighlightedOutputPath(
    originalFilePath,
    excelFileData.extId,
  );

  // Limit to top 200 pairs to safeguard performance
  const maxPairs = 200;
  const pairsToHighlight = duplicateRows.slice(0, maxPairs);

  logger.debug(
    `Highlighting ${pairsToHighlight.length} duplicate row pairs (limited from ${duplicateRows.length})`,
  );

  // Load workbook (preserving existing highlights if present)
  const workbook = await loadWorkbookForHighlighting(
    originalFilePath,
    outputPath,
  );

  const styledCells = new Set<string>();
  let skippedPairs = 0;
  let highlightedPairs = 0;

  for (let i = 0; i < pairsToHighlight.length; i++) {
    const duplicateRow = pairsToHighlight[i];
    const color = getColorForSequenceIndex(i);
    const worksheet = workbook.getWorksheet(duplicateRow.sheet.name);

    if (!worksheet) {
      logger.warn(`Sheet "${duplicateRow.sheet.name}" not found, skipping`);
      continue;
    }

    const highlighted = highlightDuplicateRowPair(
      worksheet,
      duplicateRow,
      color,
      styledCells,
    );

    if (highlighted) {
      highlightedPairs++;
    } else {
      skippedPairs++;
    }
  }

  logger.info(
    `Highlighted ${highlightedPairs} duplicate row pairs, skipped ${skippedPairs} due to overlaps`,
  );

  await workbook.xlsx.writeFile(outputPath);

  logger.info(
    `Successfully generated highlighted Excel file at '${outputPath}'`,
  );

  return outputPath;
}
