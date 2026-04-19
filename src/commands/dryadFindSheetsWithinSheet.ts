import { Command } from "@commander-js/extra-typings";
import { readdir } from "fs/promises";
import path from "path";
import xlsx from "xlsx";
import { Sheet } from "../entities/Sheet";
import { logger } from "../utils/logger";
import { parseIntArgument } from "../utils/command";
import {
  maxNumRowsToAnalyze,
  maxSheetsPerExcelFileForCopyPasteCheck,
} from "../config/config";
import { storagePaths } from "../utils/paths/storagePaths";

const program = new Command();

program
  .name("dryad-find-sheets-within-sheet")
  .description(
    "Scan Dryad dataset folders for sheets with 'sheets within a sheet' pattern in order manually check for false positives.",
  )
  .version("0.1.0")
  .argument(
    "[limit]",
    "Number of folders to process (default: 100)",
    parseIntArgument,
    100,
  )
  .action(async (limit) => {
    const dryadFilesPath = storagePaths.dryad;

    // Get all folders in storage/dryad/
    const allFolders = await readdir(dryadFilesPath);
    const foldersToProcess = allFolders.slice(0, limit);

    logger.info(
      `Starting scan of first ${foldersToProcess.length} Dryad folders...`,
    );

    // Statistics
    let foldersScanned = 0;
    let excelFilesProcessed = 0;
    let sheetsAnalyzed = 0;
    let sheetsWithinSheetFound = 0;
    let errors = 0;

    // Process folders sequentially
    for (let i = 0; i < foldersToProcess.length; i++) {
      const extId = foldersToProcess[i];
      const folderPath = path.join(dryadFilesPath, extId);

      logger.info(
        `Processing folder ${i + 1}/${foldersToProcess.length}: ${extId}`,
      );

      try {
        // Get all Excel files in the folder
        const files = await readdir(folderPath);
        const excelFiles = files.filter((file) =>
          file.toLowerCase().endsWith(".xlsx"),
        );

        if (excelFiles.length === 0) {
          continue;
        }

        // Process each Excel file
        for (const excelFile of excelFiles) {
          const excelPath = path.join(folderPath, excelFile);

          try {
            // Load the workbook
            const workbook = xlsx.readFile(excelPath, {
              sheetRows: maxNumRowsToAnalyze,
            });

            excelFilesProcessed++;

            // Process each sheet
            const sheetNames = workbook.SheetNames.slice(
              0,
              maxSheetsPerExcelFileForCopyPasteCheck,
            );

            for (const sheetName of sheetNames) {
              const workbookSheet = workbook.Sheets[sheetName];

              try {
                // Create Sheet entity (triggers detectSheetsWithinSheet)
                const sheet = new Sheet(workbookSheet, sheetName, excelFile);
                sheetsAnalyzed++;

                // Check if this sheet has sheets within sheet pattern
                if (sheet.hasSheetsWithinSheet) {
                  logger.info(`[${extId}] ${excelFile} - ${sheetName}`);
                  sheetsWithinSheetFound++;
                }
              } catch (_err) {
                // Skip sheets that fail to load (empty, invalid, etc.)
              }
            }
          } catch (err) {
            logger.debug(`Error loading ${excelFile}: ${err.message}`);
            errors++;
          }
        }

        foldersScanned++;
      } catch (err) {
        logger.debug(`Error processing folder ${extId}: ${err.message}`);
        errors++;
      }
    }

    // Print summary
    logger.info("\nSummary:");
    logger.info(`- Folders scanned: ${foldersScanned}`);
    logger.info(`- Excel files processed: ${excelFilesProcessed}`);
    logger.info(`- Sheets analyzed: ${sheetsAnalyzed}`);
    logger.info(
      `- Sheets with 'sheets within sheet' pattern: ${sheetsWithinSheetFound}`,
    );
    if (errors > 0) {
      logger.info(`- Errors encountered: ${errors}`);
    }
  });

program.parse();
