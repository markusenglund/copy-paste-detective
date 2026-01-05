import { Command } from "@commander-js/extra-typings";
import {
  getAllDatasetsWithFiles,
  getDatasetCountByStatus,
} from "../repositories/datasets/datasetsRepository";
import {
  getTotalExcelFileCount,
  getTotalExcelFileSize,
} from "../repositories/excelFiles/excelFilesRepository";
import { formatSize } from "../utils/formatSize";
import { logger } from "../utils/logger";

const program = new Command();

program
  .name("dryad-status")
  .description("Log status of imported Dryad datasets.")
  .version("0.1.0")
  .action(async () => {
    const datasets = await getAllDatasetsWithFiles();
    const excelFileCount = await getTotalExcelFileCount();

    logger.info(
      `Database contains ${datasets.length} datasets with ${excelFileCount} total Excel files.`,
    );

    const statusCounts = await getDatasetCountByStatus();
    logger.info("Datasets by download status:");
    for (const [status, count] of Object.entries(statusCounts)) {
      if (count > 0) {
        logger.info(`- ${status}: ${count} datasets`);
      }
    }

    const totalSize = await getTotalExcelFileSize();
    const averageSize = excelFileCount > 0 ? totalSize / excelFileCount : 0;
    logger.info(`Average Excel file size: ${formatSize(averageSize)}`);
    logger.info(`Total size of all Excel files: ${formatSize(totalSize)}`);

    const datasetsWithReadme = datasets.filter(
      (dataset) => dataset.readmeFile !== null,
    );
    logger.info(
      `Found ${datasetsWithReadme.length} datasets with a README file.`,
    );

    const datasetsWithReadmeOrUsageNotes = datasets.filter(
      (dataset) =>
        dataset.readmeFile !== null || dataset.usageNotes !== null,
    );
    logger.info(
      `Found ${datasetsWithReadmeOrUsageNotes.length} datasets with a README file or usage notes.`,
    );

    const excelFilesThatFitCriteria = datasetsWithReadmeOrUsageNotes.flatMap(
      (dataset) => {
        if (dataset.excelFiles.length > 4) {
          return [];
        }
        return dataset.excelFiles.filter(
          (file) => file.size < 10_000_000 && file.size > 0,
        );
      },
    );
    logger.info(
      `A total of ${excelFilesThatFitCriteria.length} Excel files fit the criteria (max 4 files per dataset, size < 10MB).`,
    );
  });

program.parse();
