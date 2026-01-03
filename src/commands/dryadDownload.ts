import { Command } from "@commander-js/extra-typings";
import {
  getDatasetsByDownloadStatusWithFiles,
  getDatasetWithFiles,
  updateDatasetDownloadStatus,
  type DryadDatasetWithFiles,
} from "../repositories/datasets/datasetsRepository";
import { updateExcelFileDownloadStatus } from "../repositories/excelFiles/excelFilesRepository";
import { updateReadmeFileDownloadStatus } from "../repositories/readmeFiles/readmeFilesRepository";
import { downloadFile } from "../dryad/downloadFile";
import { parseIntArgument } from "../utils/command";
import {
  getJournalsByIssnMap,
  formatIssn,
} from "../repositories/journals/journalsRepository";

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

    if (options.id) {
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
      // Existing filtering logic to build the list
      const journalByIssn = await getJournalsByIssnMap();
      const datasets =
        await getDatasetsByDownloadStatusWithFiles("not_started");

      const latestIndexedDatasets = datasets
        .filter((dataset) => {
          const journal = dataset.journalIssn
            ? journalByIssn.get(formatIssn(dataset.journalIssn))
            : null;
          return ["Medicine", "Psychology", "Neuroscience"].find((field) =>
            journal?.fields.includes(field),
          );
        })
        .filter((dataset) => {
          const containsUsageNotesOrReadme =
            dataset.readmeFile || dataset.usageNotes;

          if (!containsUsageNotesOrReadme) {
            return false; // Skip datasets without README or usage notes
          }

          if (dataset.excelFiles.length > 3) {
            return false; // Skip datasets with more than 3 Excel files
          }
          const onlyContainsLargeExcelFiles = dataset.excelFiles.every(
            (file) => file.size > maxFileSize,
          );
          if (onlyContainsLargeExcelFiles) {
            return false;
          }
          return true;
        })
        .toSorted((a, b) => {
          return (
            new Date(b.dryadPublicationDate).getTime() -
            new Date(a.dryadPublicationDate).getTime()
          );
        });

      console.log(
        `Found ${latestIndexedDatasets.length} datasets that fulfil the criteria for download (out of ${datasets.length}).`,
      );

      for (const dataset of latestIndexedDatasets.slice(0, count)) {
        // Log the journal name, journal score and title
        const journal = dataset.journalIssn
          ? journalByIssn.get(formatIssn(dataset.journalIssn))
          : null;
        //  Log the publishing date also
        console.log(
          `[${dataset.extId}] ${journal?.title} (${journal?.sjrScore}) - "${dataset.title}" - ${dataset.dryadPublicationDate}`,
        );
      }

      datasetsToDownload = latestIndexedDatasets.slice(0, count);
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
