import { Command } from "@commander-js/extra-typings";
import { db as analysisResultsDb } from "../dryad/analysisResultsDb";
import { db as datasetsDb } from "../dryad/datasetsDb";
import { getScimagoIssnJournalMap, normalizeIssn } from "../scimago/journal";

const program = new Command();

program
  .name("dryad-report")
  .description("Print a list of analyzed datasets ranked by suspicion level.")
  .version("0.1.0")
  .action(async () => {
    const analyzedDatasets = datasetsDb.data.datasets.filter(
      ({ status }) => status === "analyzed",
    );
    const analyzedDatasetByExtId = new Map(
      analyzedDatasets.map((dataset) => [dataset.extId, dataset]),
    );

    const scimagoIssnJournalMap = await getScimagoIssnJournalMap();

    const analysisResults = analysisResultsDb.data.results;
    const datasets = Object.entries(analysisResults)
      .filter(([extId]) => analyzedDatasetByExtId.has(Number(extId)))
      .map(([extId, datasetResult]) => {
        const dataset = analyzedDatasetByExtId.get(Number(extId));
        const journalData = dataset?.journalIssn
          ? scimagoIssnJournalMap.get(normalizeIssn(dataset.journalIssn))
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
          journalData,
        };
      })
      .toSorted(
        (a, b) =>
          b.mostSuspiciousFile.highestEntropyScore -
          a.mostSuspiciousFile.highestEntropyScore,
      );
    console.log(`Found ${datasets.length} analyzed datasets.`);
    console.table(
      datasets.map((dataset) => ({
        extId: dataset.extId,
        fileName: dataset.mostSuspiciousFile.fileName.slice(0, 50),
        highestEntropyScore:
          dataset.mostSuspiciousFile.highestEntropyScore.toFixed(2),
        journalScore: dataset.journalData?.scimagoJournalScore,
        journal: dataset.journalData?.title?.slice(0, 32),
      })),
    );
  });

program.parse();
