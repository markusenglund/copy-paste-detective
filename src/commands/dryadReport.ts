import { Command } from "@commander-js/extra-typings";
import { db } from "../dryad/analysisResultsDb";

const program = new Command();

program
  .name("dryad-report")
  .description("Print a list of analyzed datasets ranked by suspicion level.")
  .version("0.1.0")
  .action(async () => {
    const analysisResults = db.data.results;
    const datasets = Object.entries(analysisResults)
      .map(([extId, datasetResult]) => {
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
      })),
    );
  });

program.parse();
