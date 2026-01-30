import { ExcelFileData } from "../../types/ExcelFileData";
import { RepeatedColumnSequence } from "../../entities/RepeatedColumnSequence";
import { getHighlightedOutputPath } from "../../utils/paths/getHighlightedOutputPath";
import { mapSequencesToCellRanges } from "../../utils/excel/cellRangeMapper";
import { writeStyledExcelFile } from "../../utils/excel/writeStyledExcelFile";
import { logger } from "../../utils/logger";

/**
 * Generate highlighted Excel file with repeated column sequences marked with colors and borders.
 *
 * @param excelFileData - Excel file metadata including extId and filename
 * @param originalFilePath - Path to original Excel file
 * @param sequences - Detected repeated column sequences to highlight
 * @returns Path to generated highlighted file, or null if generation failed
 */
export async function generateHighlightedExcel(
  excelFileData: ExcelFileData,
  originalFilePath: string,
  sequences: RepeatedColumnSequence[],
): Promise<string | null> {
  if (sequences.length === 0) {
    logger.warn("No sequences to highlight, skipping Excel generation");
    return null;
  }

  logger.info(
    `[${excelFileData.extId}] Generating highlighted Excel file for '${excelFileData.excelFileName}'`,
  );

  // Generate output path
  const outputPath = getHighlightedOutputPath(
    originalFilePath,
    excelFileData.extId,
  );

  // Convert sequences to styled cell ranges
  logger.debug(`Mapping ${sequences.length} sequences to cell ranges`);
  // Limit to top 50 sequences to safeguard performance
  const maxCellRanges = 50;

  const cellRanges = mapSequencesToCellRanges(sequences).slice(
    0,
    maxCellRanges,
  );
  logger.debug(`Mapped to ${cellRanges.length} cell ranges`);

  // Write styled Excel file
  await writeStyledExcelFile(originalFilePath, outputPath, cellRanges);

  logger.info(
    `Successfully generated highlighted Excel file at '${outputPath}'`,
  );

  return outputPath;
}
