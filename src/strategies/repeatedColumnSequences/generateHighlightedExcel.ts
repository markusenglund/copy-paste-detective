import { ExcelFileData } from "../../types/ExcelFileData";
import { RepeatedColumnSequence } from "../../entities/RepeatedColumnSequence";
import {
  getHighlightedOutputPath,
  checkHighlightedFileExists,
} from "../../utils/paths/getHighlightedOutputPath";
import {
  mapSequencesToCellRanges,
  getUsedColorsFromWorkbook,
} from "../../utils/excel/cellRangeMapper";
import { writeStyledExcelFile } from "../../utils/excel/writeStyledExcelFile";
import { logger } from "../../utils/logger";
import xlsxStyle from "xlsx-js-style";

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
  try {
    if (sequences.length === 0) {
      logger.debug("No sequences to highlight, skipping Excel generation");
      return null;
    }

    logger.info("Generating highlighted Excel file...");

    logger.debug(`Original file path: ${originalFilePath}`);
    logger.debug(`ExtId: ${excelFileData.extId || "none"}`);

    // Generate output path
    const outputPath = getHighlightedOutputPath(
      originalFilePath,
      excelFileData.extId,
    );
    logger.debug(`Output path: ${outputPath}`);

    // Check if file already exists and get used colors to avoid conflicts
    logger.debug("Checking if highlighted file exists");
    let usedColors = new Set<string>();
    if (checkHighlightedFileExists(outputPath)) {
      logger.debug(
        "Highlighted file exists, reading used colors to avoid conflicts",
      );
      try {
        const existingWorkbook = xlsxStyle.readFile(outputPath);
        usedColors = getUsedColorsFromWorkbook(existingWorkbook);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(
          `Failed to read existing highlighted file for color detection: ${message}`,
        );
      }
    }

    // Convert sequences to styled cell ranges
    logger.debug(`Mapping ${sequences.length} sequences to cell ranges`);
    const cellRanges = mapSequencesToCellRanges(sequences, usedColors);
    logger.debug(`Mapped to ${cellRanges.length} cell ranges`);

    // Limit to top 50 sequences if there are too many (performance safeguard)
    const maxSequences = 50;
    if (cellRanges.length > maxSequences) {
      logger.warn(
        `Found ${cellRanges.length} sequence occurrences, limiting to top ${maxSequences} for performance`,
      );
      cellRanges.splice(maxSequences);
    }

    // Write styled Excel file
    await writeStyledExcelFile(originalFilePath, outputPath, cellRanges);

    logger.info(`Successfully generated highlighted Excel file`);
    logger.info(`Location: ${outputPath}`);

    return outputPath;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to generate highlighted Excel: ${message}`);
    // Don't throw - we don't want to break the detection pipeline
    return null;
  }
}
