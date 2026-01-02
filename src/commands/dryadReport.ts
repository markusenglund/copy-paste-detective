import { Command } from "@commander-js/extra-typings";
import { db as analysisResultsDb } from "../dryad/analysisResultsDb";
import { getDatasetsByDownloadStatusWithFiles } from "../repositories/datasets/datasetsRepository";
import {
  getJournalsByIssnMap,
  formatIssn,
} from "../repositories/journals/journalsRepository";

const program = new Command();

program
  .name("dryad-report")
  .description("Print a list of analyzed datasets ranked by suspicion level.")
  .version("0.1.0")
  .action(async () => {
    // Get all completed (downloaded) datasets
    const completedDatasets =
      await getDatasetsByDownloadStatusWithFiles("completed");
    const datasetByExtId = new Map(
      completedDatasets.map((dataset) => [dataset.extId, dataset]),
    );

    const journalByIssn = await getJournalsByIssnMap();

    const analysisResults = analysisResultsDb.data.results;

    // Filter to only include datasets that have been analyzed
    const datasets = Object.entries(analysisResults)
      .filter(([extId]) => datasetByExtId.has(Number(extId)))
      .map(([extId, datasetResult]) => {
        const dataset = datasetByExtId.get(Number(extId));
        const journal = dataset?.journalIssn
          ? journalByIssn.get(formatIssn(dataset.journalIssn))
          : null;
        const files = Object.entries(datasetResult).map(
          ([fileName, fileResult]) => ({
            fileName,
            highestEntropyScore: Math.max(
              fileResult.duplicateRowEntropyScores[0] ?? 0,
              fileResult.columnSequencesEntropyScores[0] ?? 0,
            ),
            ...fileResult,
          }),
        );
        const mostSuspiciousFile = files.toSorted(
          (a, b) => b.highestEntropyScore - a.highestEntropyScore,
        )[0];
        return {
          extId,
          files,
          mostSuspiciousFile,
          journal,
        };
      })
      .toSorted(
        (a, b) =>
          b.mostSuspiciousFile.highestEntropyScore -
          a.mostSuspiciousFile.highestEntropyScore,
      )
      .slice(0, 100);

    console.log(`Found ${datasets.length} analyzed datasets.`);
    console.table(
      datasets.map((dataset) => ({
        extId: dataset.extId,
        fileName: dataset.mostSuspiciousFile.fileName.slice(0, 50),
        highestEntropyScore:
          dataset.mostSuspiciousFile.highestEntropyScore.toFixed(2),
        journalScore: dataset.journal?.sjrScore,
        journal: dataset.journal?.title?.slice(0, 32),
      })),
    );
  });

program.parse();
