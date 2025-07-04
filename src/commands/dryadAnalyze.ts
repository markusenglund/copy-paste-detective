import { Command } from "@commander-js/extra-typings";
import { db } from "../dryad/datasetsDb";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { StrategyName } from "../types/strategies";
import { runStrategies } from "../runStrategies";

const program = new Command();

program
  .name("dryad-analyze")
  .description("Analyze excel files from downloaded Dryad datasets.")
  .version("0.1.0")
  .action(async () => {
    const datasets = db.data.datasets;
    const downloadedDatasets = datasets
      .filter((dataset) => dataset.status === "downloaded")
      .toSorted((a, b) => {
        return (
          new Date(b.dryadPublicationDate).getTime() -
          new Date(a.dryadPublicationDate).getTime()
        );
      });

    console.log(
      `Found ${downloadedDatasets.length} datasets that are marked as downloaded.`,
    );

    for (let i = 0; i < Math.min(1, downloadedDatasets.length); i++) {
      const dataset = downloadedDatasets[i];
      console.log(
        `[${i}] Analyzing dataset ${dataset.extId} from ${dataset.dryadPublicationDate} with ${dataset.excelFiles.length} Excel files ("${dataset.title}")`,
      );
      for (let i = 0; i < dataset.excelFiles.length; i++) {
        const excelFile = dataset.excelFiles[i];
        console.log(`- ${excelFile.filename} (${excelFile.size} bytes)`);
        const excelFileData = loadExcelFileFromDryadIndex(dataset, i);
        const allStrategies = Object.values(StrategyName);
        await runStrategies(allStrategies, excelFileData);
      }
    }
  });

program.parse();
