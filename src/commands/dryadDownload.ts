import { Command } from "@commander-js/extra-typings";
import { db } from "../dryad/datasetsDb";
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
  .action(async (count) => {
    const datasets = db.data.datasets;
    const maxFileSize = 10_000_000; // 10MB

    const latestIndexedDatasets = datasets
      .filter((dataset) => dataset.status === "indexed")
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

    for (let i = 0; i < Math.min(count, latestIndexedDatasets.length); i++) {
      const dataset = latestIndexedDatasets[i];
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
              fileId: excelFile.fileId,
              filename: excelFile.filename,
              datasetId: dataset.extId,
            });
            excelFile.status = "downloaded";
          } catch (err) {
            console.error(err);
            numFailedDownloads += 1;
          }
        }
      }
      if (dataset.readmeFile) {
        try {
          await downloadFile({
            fileId: dataset.readmeFile.fileId,
            filename: dataset.readmeFile.filename,
            datasetId: dataset.extId,
          });
          dataset.readmeFile.status = "downloaded";
        } catch (err) {
          console.error(err);
        }
      }
      if (numFailedDownloads === dataset.excelFiles.length) {
        dataset.status = "failed";
      } else {
        dataset.status = "downloaded";
      }
      await db.write();
    }
  });

program.parse();
