import { Command } from "@commander-js/extra-typings";
import {
  getDryadDatasetsByDownloadStatusWithFiles,
  getDryadDatasetCountByStatus,
} from "../repositories/datasets/unifiedDatasetsRepository";
import { formatSize } from "../utils/formatSize";
import { logger } from "../utils/logger";
import { closeDb } from "../db";

const program = new Command();

program
  .name("dryad-status")
  .description("Log status of imported Dryad datasets.")
  .version("0.1.0")
  .action(async () => {
    try {
      const datasets = await getDryadDatasetsByDownloadStatusWithFiles(
        "completed",
        100000,
      );

      const allExcelFiles = datasets.flatMap((d) =>
        d.dataFiles.filter((f) => f.fileType === "excel"),
      );
      const excelFileCount = allExcelFiles.length;

      logger.info(
        `Database contains ${datasets.length} completed datasets with ${excelFileCount} total Excel files.`,
      );

      const statusCounts = await getDryadDatasetCountByStatus();
      logger.info("Datasets by download status:");
      for (const [status, count] of Object.entries(statusCounts)) {
        if (count > 0) {
          logger.info(`- ${status}: ${count} datasets`);
        }
      }

      const totalSize = allExcelFiles.reduce((sum, f) => sum + f.size, 0);
      const averageSize = excelFileCount > 0 ? totalSize / excelFileCount : 0;
      logger.info(`Average Excel file size: ${formatSize(averageSize)}`);
      logger.info(`Total size of all Excel files: ${formatSize(totalSize)}`);

      const datasetsWithReadme = datasets.filter((dataset) =>
        dataset.dataFiles.some((f) => f.fileType === "readme"),
      );
      logger.info(
        `Found ${datasetsWithReadme.length} datasets with a README file.`,
      );

      const datasetsWithReadmeOrUsageNotes = datasets.filter(
        (dataset) =>
          dataset.dataFiles.some((f) => f.fileType === "readme") ||
          dataset.dryadDetails.usageNotes !== null,
      );
      logger.info(
        `Found ${datasetsWithReadmeOrUsageNotes.length} datasets with a README file or usage notes.`,
      );

      const excelFilesThatFitCriteria = datasetsWithReadmeOrUsageNotes.flatMap(
        (dataset) => {
          const excelFiles = dataset.dataFiles.filter(
            (f) => f.fileType === "excel",
          );
          if (excelFiles.length > 4) {
            return [];
          }
          return excelFiles.filter(
            (file) => file.size < 10_000_000 && file.size > 0,
          );
        },
      );
      logger.info(
        `A total of ${excelFilesThatFitCriteria.length} Excel files fit the criteria (max 4 files per dataset, size < 10MB).`,
      );
    } finally {
      await closeDb();
    }
  });

program.parse();
