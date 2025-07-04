import { Command } from "@commander-js/extra-typings";
import { db } from "../dryad/datasetsDb";
import { downloadFile } from "../dryad/downloadFile";

const program = new Command();

program
  .name("dryad-download")
  .description(
    "Download excel files from Dryad that were previously indexed in the database.",
  )
  .version("0.1.0")
  .action(async () => {
    const datasets = db.data.datasets;

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
        const maxFileSize = 10_000_000; // 10MB
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

    for (const dataset of latestIndexedDatasets.slice(0, 1)) {
      console.log(
        `Downloading dataset ${dataset.extId} from ${dataset.dryadPublicationDate} ("${dataset.title}")`,
      );
      console.log(
        `${dataset.excelFiles.length} Excel files found:\n ${dataset.excelFiles.map((file) => file.filename).join("\n")}`,
      );
      for (const excelFile of dataset.excelFiles) {
        await downloadFile({
          fileId: excelFile.fileId,
          filename: excelFile.filename,
          datasetId: dataset.extId,
        });
      }
    }
  });

program.parse();
