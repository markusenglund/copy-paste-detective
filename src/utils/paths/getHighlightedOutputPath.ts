import path from "path";
import fs from "fs";

/**
 * Generate output path for highlighted Excel files.
 * Structure: highlighted-output/{extId}/{original-filename}.xlsx
 *
 * @param originalFilePath - Full path to the original Excel file
 * @param extId - Dataset external ID (e.g., "158552")
 * @returns Full path to highlighted output file
 */
export function getHighlightedOutputPath(
  originalFilePath: string,
  extId?: string,
): string {
  const filename = path.basename(originalFilePath);
  const datasetFolder = extId || "unknown";
  const outputDir = path.join(
    process.cwd(),
    "highlighted-output",
    datasetFolder,
  );

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  return path.join(outputDir, filename);
}

/**
 * Check if a highlighted file already exists.
 * Used to determine if we should copy the original or use existing highlighted file as base.
 *
 * @param highlightedPath - Path to check
 * @returns true if file exists
 */
export function checkHighlightedFileExists(highlightedPath: string): boolean {
  return fs.existsSync(highlightedPath);
}
