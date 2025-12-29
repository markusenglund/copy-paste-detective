import { Command } from "@commander-js/extra-typings";
import { db as datasetDb } from "../dryad/datasetsDb";
import { db as analysisResultsDb } from "../dryad/analysisResultsDb";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { StrategyName } from "../types/strategies";
import { runStrategies } from "../runStrategies";
import { AnalysisResults } from "../dryad/analysisResultsDb";
import { parseIntArgument } from "../utils/command";
import { getScimagoIssnJournalMap, normalizeIssn } from "../scimago/journal";
import { maxExcelFilesPerDataset } from "../config/config";

const program = new Command();

program
  .name("dryad-detect-all")
  .description("Analyze excel files from downloaded Dryad datasets.")
  .version("0.1.0")
  .argument("[count]", "Number of datasets to analyze", parseIntArgument, 100)

  .action(async (count) => {
    const scimagoIssnJournalMap = await getScimagoIssnJournalMap();

    const datasets = datasetDb.data.datasets;
    const downloadedDatasets = datasets
      .filter((dataset) => dataset.status === "downloaded")
      .toSorted((a, b) => {
        return (
          new Date(b.dryadPublicationDate).getTime() -
          new Date(a.dryadPublicationDate).getTime()
        );
      });

    const numDatasetsToAnalyze = Math.min(count, downloadedDatasets.length);

    console.log(
      `Analyzing ${numDatasetsToAnalyze} of ${downloadedDatasets.length} datasets that are marked as downloaded.`,
    );

    // For each dataset, log the journal name, journal score and title
    for (const dataset of downloadedDatasets.slice(0, numDatasetsToAnalyze)) {
      const journalData = dataset.journalIssn
        ? scimagoIssnJournalMap.get(normalizeIssn(dataset.journalIssn))
        : null;
      console.log(
        `[${dataset.extId}] ${journalData?.title} (${journalData?.scimagoJournalScore}) - "${dataset.title}" - ${dataset.dryadPublicationDate}`,
      );
    }

    for (let i = 0; i < numDatasetsToAnalyze; i++) {
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
