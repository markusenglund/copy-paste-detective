import { Command } from "@commander-js/extra-typings";
import {
  getDatasetsForDownload,
  getDatasetWithFiles,
  updateDatasetDownloadStatus,
  type DryadDatasetWithFiles,
} from "../repositories/datasets/datasetsRepository";
import { updateExcelFileDownloadStatus } from "../repositories/excelFiles/excelFilesRepository";
import { updateReadmeFileDownloadStatus } from "../repositories/readmeFiles/readmeFilesRepository";
import { downloadFile } from "../dryad/downloadFile";
import { parseIntArgument } from "../utils/command";

const program = new Command();

program
  .name("dryad-download")
  .description(
    "Download excel files from Dryad that were previously indexed in the database.",
  )
  .version("0.1.0")
  .argument("[count]", "Number of datasets to download", parseIntArgument, 100)
  .option("--id <extId>", "Download a specific dataset by its Dryad ID (extId)")
  .action(async (count, options) => {
    const maxFileSize = 10_000_000; // 10MB
    let datasetsToDownload: DryadDatasetWithFiles[];
    console.log("Dryad download");
    if (options.id) {
      console.log("Options id:", options.id);
      // Get single dataset by ID, put in array
      const extId = parseInt(options.id, 10);
      if (isNaN(extId)) {
        console.error(`Invalid extId "${options.id}". Must be a number.`);
        process.exit(1);
      }
      const dataset = await getDatasetWithFiles(extId);
      if (!dataset) {
        console.error(`Dataset with extId "${options.id}" not found.`);
        process.exit(1);
      }
      datasetsToDownload = [dataset];
    } else {
      console.log("Fetching datasets for download...");
      const datasets = await getDatasetsForDownload(count);
      console.log(`Fetched ${datasets.length} candidate datasets`);

      // Separate datasets by whether they have downloadable files
      const downloadable: DryadDatasetWithFiles[] = [];
      const skipped: DryadDatasetWithFiles[] = [];

      for (const dataset of datasets) {
        const hasDownloadableFile = dataset.excelFiles.some(
          (file) => file.size <= maxFileSize,
        );
        if (hasDownloadableFile) {
          downloadable.push(dataset);
        } else {
          skipped.push(dataset);
        }
      }

      // Mark skipped datasets (all files too large)
      for (const dataset of skipped) {
        console.log(
          `Skipping dataset ${dataset.extId} - all files exceed ${maxFileSize / 1_000_000}MB`,
        );
        await updateDatasetDownloadStatus(dataset.extId, "skipped");
      }

      console.log(
        `Found ${downloadable.length} datasets to download, ${skipped.length} skipped`,
      );

      for (const dataset of downloadable) {
        console.log(
          `[${dataset.extId}] "${dataset.title}" - ${dataset.dryadPublicationDate}`,
        );
      }

      datasetsToDownload = downloadable;
    }

    // Single download loop for all cases
    for (let i = 0; i < datasetsToDownload.length; i++) {
      const dataset = datasetsToDownload[i];
      console.log(
        `[${i}] Downloading dataset ${dataset.extId} from ${dataset.dryadPublicationDate} ("${dataset.title}")`,
      );
      console.log(
        `${dataset.excelFiles.length} Excel files found:\n ${dataset.excelFiles.map((file) => file.filename).join("\n")}`,
      );

      let numFailedDownloads = 0;

      for (const excelFile of dataset.excelFiles) {
        if (excelFile.size < maxFileSize) {
          try {
            await downloadFile({
              fileId: excelFile.extFileId,
              filename: excelFile.filename,
              datasetId: dataset.extId,
            });
            await updateExcelFileDownloadStatus(excelFile.id, "completed");
          } catch (err) {
            console.error(err);
            await updateExcelFileDownloadStatus(excelFile.id, "failed");
            numFailedDownloads += 1;
          }
        }
      }
      if (dataset.readmeFile) {
        try {
          await downloadFile({
            fileId: dataset.readmeFile.extFileId,
            filename: dataset.readmeFile.filename,
            datasetId: dataset.extId,
          });
          await updateReadmeFileDownloadStatus(
            dataset.readmeFile.id,
            "completed",
          );
        } catch (err) {
          console.error(err);
          await updateReadmeFileDownloadStatus(dataset.readmeFile.id, "failed");
        }
      }
      if (numFailedDownloads === dataset.excelFiles.length) {
        await updateDatasetDownloadStatus(dataset.extId, "failed");
      } else {
        await updateDatasetDownloadStatus(dataset.extId, "completed");
      }
    }
  });

program.parse();
