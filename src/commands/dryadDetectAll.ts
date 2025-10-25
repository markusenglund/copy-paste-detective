import { Command } from "@commander-js/extra-typings";
import { db as datasetDb } from "../dryad/datasetsDb";
import { db as analysisResultsDb } from "../dryad/analysisResultsDb";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { StrategyName } from "../types/strategies";
import { runStrategies } from "../runStrategies";
import { AnalysisResults } from "../dryad/analysisResultsDb";

const program = new Command();

const maxExcelFilesPerDataset = 5;

program
  .name("dryad-detect-all")
  .description("Analyze excel files from downloaded Dryad datasets.")
  .version("0.1.0")
  .action(async () => {
    const datasets = datasetDb.data.datasets;
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

    for (let i = 0; i < downloadedDatasets.length; i++) {
      const dataset = downloadedDatasets[i];
      console.log(
        `[${i}] Analyzing dataset ${dataset.extId} from ${dataset.dryadPublicationDate} with ${dataset.excelFiles.length} Excel files ("${dataset.title}")`,
      );
      analysisResultsDb.data.results[dataset.extId] = {};
      for (
        let j = 0;
        j < Math.min(dataset.excelFiles.length, maxExcelFilesPerDataset);
        j++
      ) {
        console.log(
          `[${i}] Analyzing file ${j} out of ${dataset.excelFiles.length}`,
        );
        const excelFile = dataset.excelFiles[j];
        if (excelFile.status !== "downloaded") {
          continue;
        }
        console.log(`- ${excelFile.filename} (${excelFile.size} bytes)`);
        const excelFileData = loadExcelFileFromDryadIndex(dataset, j);
        const allStrategies = Object.values(StrategyName);
        const strategyResults = await runStrategies(
          allStrategies,
          excelFileData,
        );

        const duplicateRows =
          strategyResults[StrategyName.DuplicateRows]?.duplicateRows || [];
        const duplicateRowEntropyScores = duplicateRows
          .map((row) => row.matrixSizeAdjustedEntropyScore)
          .slice(0, 20);
        const repeatedColumnSequences =
          strategyResults[StrategyName.RepeatedColumnSequences]?.sequences ||
          [];
        const columnSequencesEntropyScores = repeatedColumnSequences
          .map((seq) => seq.matrixSizeAdjustedEntropyScore)
          .slice(0, 20);

        const analysisResults: AnalysisResults = {
          fileIndex: j,
          duplicateRowEntropyScores,
          columnSequencesEntropyScores,
          analysisVersion: "2025.07.04",
        };
        analysisResultsDb.data.results[dataset.extId][excelFile.filename] =
          analysisResults;
        console.log(
          `Finished analyzing excel file ${j}: ${excelFile.filename} belonging to ${dataset.extId} (${i}).`,
        );
      }
      await analysisResultsDb.write();
      dataset.status = "analyzed";
      await datasetDb.write();
      console.log(
        `Dataset ${dataset.extId} (${i}) analyzed and results saved.`,
      );
    }
  });

program.parse();
