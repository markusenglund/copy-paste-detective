import { Command } from "@commander-js/extra-typings";
import { db } from "../dryad/datasetsDb";

const program = new Command();

program
  .name("dryad-download")
  .description(
    "Download excel files from Dryad that were previously indexed in the database.",
  )
  .version("0.1.0")
  .action(async () => {
    const datasets = db.data.datasets;
    console.log(
      `Found ${datasets.length} total datasets available for download.`,
    );
    const latestDatasets = datasets
      .toSorted((a, b) => {
        return (
          new Date(b.dryadPublicationDate).getTime() -
          new Date(a.dryadPublicationDate).getTime()
        );
      })
      .slice(0, 10);

    console.log(
      `Downloading latest ${latestDatasets.length} datasets by publication date`,
    );

    const dataset = latestDatasets[0];
    console.log(
      `Downloading dataset ${dataset.extId} ("${dataset.title}") published on ${dataset.dryadPublicationDate}`,
    );

    console.log(
      `${dataset.excelFiles.length} Excel files found:\n ${dataset.excelFiles.map((file) => file.filename).join("\n")}`,
    );
  });

program.parse();
