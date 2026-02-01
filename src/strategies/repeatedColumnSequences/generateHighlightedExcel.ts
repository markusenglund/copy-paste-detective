import { ExcelFileData } from "../../types/ExcelFileData";
import { RepeatedColumnSequence } from "../../entities/RepeatedColumnSequence";
import { getHighlightedOutputPath } from "../../utils/paths/getHighlightedOutputPath";
import { logger } from "../../utils/logger";
import { loadWorkbookForHighlighting } from "../../utils/excel/loadWorkbookForHighlighting";
import { highlightRepeatedColumnSequence } from "./highlighting/highlightRepeatedColumnSequence";
import { getColorForSequenceIndex } from "../../utils/excel/styleConstants";

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

  // Limit to top 50 sequences to safeguard performance
  const maxSequences = 50;
  const sequencesToHighlight = sequences.slice(0, maxSequences);

  logger.debug(
    `Highlighting ${sequencesToHighlight.length} column sequences (limited from ${sequences.length})`,
  );

  // Load workbook (preserving existing highlights if present)
  const workbook = await loadWorkbookForHighlighting(
    originalFilePath,
    outputPath,
  );

  const styledCells = new Set<string>();
  let skippedSequences = 0;
  let highlightedSequences = 0;

  for (let i = 0; i < sequencesToHighlight.length; i++) {
    const repeatedSequence = sequencesToHighlight[i];
    const color = getColorForSequenceIndex(i);
    const worksheet = workbook.getWorksheet(repeatedSequence.sheetName);

    if (!worksheet) {
      logger.warn(`Sheet "${repeatedSequence.sheetName}" not found, skipping`);
      continue;
    }

    const highlighted = highlightRepeatedColumnSequence(
      worksheet,
      repeatedSequence,
      color,
      styledCells,
    );

    if (highlighted) {
      highlightedSequences++;
    } else {
      skippedSequences++;
    }
  }

  logger.info(
    `Highlighted ${highlightedSequences} column sequences, skipped ${skippedSequences} due to overlaps`,
  );

  await workbook.xlsx.writeFile(outputPath);

  logger.info(
    `Successfully generated highlighted Excel file at '${outputPath}'`,
  );

  return outputPath;
}
