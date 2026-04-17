import { Command } from "@commander-js/extra-typings";
import { closeDb } from "../db";
import { getDryadDatasetByExtId } from "../repositories/datasets/unifiedDatasetsRepository";
import { maxExcelFilesPerDataset } from "../config/config";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { parseIntArgument } from "../utils/command";
import { logger } from "../utils/logger";

const SAMPLE_ROW_COUNT = 5;

const program = new Command();

program
  .name("check-formula-relationship")
  .description(
    "Inspect sample rows from a Dryad dataset to identify formula relationships between columns.",
  )
  .argument("<datasetExtId>", "Dryad dataset external ID", parseIntArgument)
  .action(async (datasetExtId) => {
    try {
      const dataset = await getDryadDatasetByExtId(datasetExtId);
      if (!dataset) {
        logger.error(
          `Dataset with extId ${datasetExtId} not found in the database.`,
        );
        process.exit(1);
      }
      if (dataset.downloadStatus !== "completed") {
        logger.error(
          `Dataset with extId ${datasetExtId} is not downloaded. Status: ${dataset.downloadStatus}`,
        );
        process.exit(1);
      }

      const excelFiles = dataset.dataFiles.filter(
        (f) => f.fileType === "excel",
      );
      const filesToProcess = excelFiles.slice(0, maxExcelFilesPerDataset);

      for (let i = 0; i < filesToProcess.length; i++) {
        const fileEntry = filesToProcess[i];
        if (fileEntry.downloadStatus !== "completed") {
          logger.info(`Skipping '${fileEntry.filename}' — not downloaded.`);
          continue;
        }

        const excelFileData = loadExcelFileFromDryadIndex(dataset, i);

        for (const sheet of excelFileData.sheets) {
          console.log(
            `\n=== File: ${fileEntry.filename} | Sheet: ${sheet.name} ===`,
          );
          console.log(
            `Columns (${sheet.columnNames.length}): ${sheet.columnNames.join(" | ")}`,
          );
          console.log();

          const availableRows = sheet.numRows - sheet.firstDataRowIndex;
          if (availableRows <= 0) {
            console.log("(no data rows)");
            continue;
          }

          const rowCount = Math.min(SAMPLE_ROW_COUNT, availableRows);
          const sampleRows = sheet.getSampleData(rowCount);

          sampleRows.forEach((row, idx) => {
            console.log(`Row ${idx + 1}: ${row.join(" | ")}`);
          });
        }
      }
    } finally {
      await closeDb();
    }
  });

program.parse();
