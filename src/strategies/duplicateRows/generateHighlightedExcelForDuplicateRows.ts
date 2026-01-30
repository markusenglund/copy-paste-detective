import { ExcelFileData } from "../../types/ExcelFileData";
import { DuplicateRow } from "../../entities/DuplicateRow";
import { getHighlightedOutputPath } from "../../utils/paths/getHighlightedOutputPath";
import { mapDuplicateRowsToCellRanges } from "./duplicateRowCellRangeMapper";
import { writeStyledExcelFile } from "../../utils/excel/writeStyledExcelFile";
import { logger } from "../../utils/logger";

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

  // Convert duplicate rows to styled cell ranges
  logger.debug(
    `Mapping ${duplicateRows.length} duplicate row pairs to cell ranges`,
  );
  // Limit to top 200 pairs to safeguard performance
  const maxPairs = 200;

  const cellRanges = mapDuplicateRowsToCellRanges(
    duplicateRows.slice(0, maxPairs),
  );
  logger.debug(`Mapped to ${cellRanges.length} cell ranges`);

  // Write styled Excel file
  await writeStyledExcelFile(originalFilePath, outputPath, cellRanges);

  logger.info(
    `Successfully generated highlighted Excel file at '${outputPath}'`,
  );

  return outputPath;
}
