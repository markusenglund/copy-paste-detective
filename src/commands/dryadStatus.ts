import { Command } from "@commander-js/extra-typings";
import { groupBy } from "lodash-es";
import { db } from "../dryad/datasetsDb";
import { formatSize } from "../utils/formatSize";

const program = new Command();

program
  .name("dryad-download")
  .description(
    "Download excel files from Dryad that were previously indexed in the database.",
  )
  .version("0.1.0")
  .action(async () => {
    const datasets = db.data.datasets;
    const excelFiles = datasets.flatMap((dataset) => dataset.excelFiles);

    console.log(
      `Database contains ${datasets.length} datasets with ${excelFiles.length} total Excel files.`,
    );
    const datasetsByStatus = groupBy(datasets, "status");
    const datasetsByStatusEntries = Object.entries(datasetsByStatus);
    console.log("Datasets by status:");
    datasetsByStatusEntries.forEach(([status, datasets]) => {
      console.log(`- ${status}: ${datasets.length} datasets`);
    });
    const sumSize = excelFiles.reduce((acc, file) => acc + file.size, 0);
    const averageSize = sumSize / excelFiles.length;
    console.log(`Average Excel file size: ${formatSize(averageSize)}`);
    console.log(`Total size of all Excel files: ${formatSize(sumSize)}`);

    const datasetsWithReadme = datasets.filter(
      (dataset) => dataset.readmeFile !== undefined,
    );
    console.log(
      `Found ${datasetsWithReadme.length} datasets with a README file.`,
    );

    const datasetsWithReadmeOrUsageNotes = datasets.filter(
      (dataset) =>
        dataset.readmeFile !== undefined || dataset.usageNotes !== undefined,
    );
    console.log(
      `Found ${datasetsWithReadmeOrUsageNotes.length} datasets with a README file or usage notes.`,
    );
  });

program.parse();
