import { Command } from "@commander-js/extra-typings";
import {
  getDownloadedNotAnalyzedDatasetsWithFiles,
  updateDatasetAnalysisStatus,
} from "../repositories/datasets/datasetsRepository";
import { db as analysisResultsDb } from "../dryad/analysisResultsDb";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { StrategyName } from "../types/strategies";
import { analyzeDataset } from "../detection/analyzeDataset";
import { AnalysisResults } from "../dryad/analysisResultsDb";
import { parseIntArgument } from "../utils/command";
import {
  getJournalsByIssnMap,
  formatIssn,
} from "../repositories/journals/journalsRepository";
import { maxExcelFilesPerDataset } from "../config/config";
import { ExcelFileData } from "../types/ExcelFileData";

const program = new Command();

program
  .name("dryad-detect-all")
  .description("Analyze excel files from downloaded Dryad datasets.")
  .version("0.1.0")
  .argument("[count]", "Number of datasets to analyze", parseIntArgument, 100)

  .action(async (count) => {
    const journalByIssn = await getJournalsByIssnMap();

    // Get datasets that have been downloaded but not yet analyzed
    const downloadedDatasets = (
      await getDownloadedNotAnalyzedDatasetsWithFiles()
    ).toSorted((a, b) => {
      return (
        new Date(b.dryadPublicationDate).getTime() -
        new Date(a.dryadPublicationDate).getTime()
      );
    });

    const numDatasetsToAnalyze = Math.min(count, downloadedDatasets.length);

    console.log(
      `Analyzing ${numDatasetsToAnalyze} of ${downloadedDatasets.length} datasets that are downloaded and not yet analyzed.`,
    );

    // For each dataset, log the journal name, journal score and title
    for (const dataset of downloadedDatasets.slice(0, numDatasetsToAnalyze)) {
      const journal = dataset.journalIssn
        ? journalByIssn.get(formatIssn(dataset.journalIssn))
        : null;
      console.log(
        `[${dataset.extId}] ${journal?.title} (${journal?.sjrScore}) - "${dataset.title}" - ${dataset.dryadPublicationDate}`,
      );
    }

    for (let i = 0; i < numDatasetsToAnalyze; i++) {
      const dataset = downloadedDatasets[i];
      console.log(
        `[${i}] Analyzing dataset ${dataset.extId} from ${dataset.dryadPublicationDate} with ${dataset.excelFiles.length} Excel files ("${dataset.title}")`,
      );
      analysisResultsDb.data.results[dataset.extId] = {};

      // Load all downloaded Excel files for this dataset
      const excelFilesData: ExcelFileData[] = [];

      for (
        let j = 0;
        j < Math.min(dataset.excelFiles.length, maxExcelFilesPerDataset);
        j++
      ) {
        const excelFile = dataset.excelFiles[j];
        if (excelFile.downloadStatus !== "completed") {
          console.log(
            `[${i}] Skipping file ${j} (${excelFile.filename}) - not downloaded`,
          );
          continue;
        }
        console.log(
          `[${i}] Loading file ${j}: ${excelFile.filename} (${excelFile.size} bytes)`,
        );
        const excelFileData = loadExcelFileFromDryadIndex(dataset, j);
        excelFilesData.push(excelFileData);
      }

      try {
        // Analyze all files in the dataset together
        const allStrategies = Object.values(StrategyName);
        const { analyses, wasFlaggedForReview, aiReviewCompleted } =
          await analyzeDataset(excelFilesData, allStrategies);

        // Save results from each analysis to JSON (backward compatibility)
        for (const analysis of analyses) {
          const duplicateRows =
            analysis.results[StrategyName.DuplicateRows]?.duplicateRows || [];
          const duplicateRowEntropyScores = duplicateRows
            .map((row) => row.matrixSizeAdjustedEntropyScore)
            .slice(0, 20);
          const repeatedColumnSequences =
            analysis.results[StrategyName.RepeatedColumnSequences]?.sequences ||
            [];
          const columnSequencesEntropyScores = repeatedColumnSequences
            .map((seq) => seq.matrixSizeAdjustedEntropyScore)
            .slice(0, 20);

          const analysisResults: AnalysisResults = {
            filename: analysis.excelFileName,
            duplicateRowEntropyScores,
            columnSequencesEntropyScores,
            analysisVersion: "2025.07.04",
          };
          analysisResultsDb.data.results[dataset.extId][
            analysis.excelFileName
          ] = analysisResults;
          console.log(
            `Finished analyzing excel file '${analysis.excelFileName}' belonging to ${dataset.extId} (${i}).`,
          );
        }

        await analysisResultsDb.write();

        // Update analysis status based on the result
        if (!wasFlaggedForReview) {
          await updateDatasetAnalysisStatus(
            dataset.extId,
            "not_flagged_for_review",
          );
          console.log(
            `Dataset ${dataset.extId} (${i}) analyzed - no suspicious findings requiring AI review.`,
          );
        } else if (aiReviewCompleted) {
          await updateDatasetAnalysisStatus(dataset.extId, "reviewed_by_ai");
          console.log(
            `Dataset ${dataset.extId} (${i}) analyzed and AI review completed.`,
          );
        } else {
          // Was flagged but AI review didn't complete (shouldn't happen normally)
          await updateDatasetAnalysisStatus(
            dataset.extId,
            "flagged_for_review",
          );
          console.log(
            `Dataset ${dataset.extId} (${i}) flagged for AI review but review incomplete.`,
          );
        }
      } catch (error) {
        console.error(
          `Error analyzing dataset ${dataset.extId} (${i}):`,
          error,
        );
        await updateDatasetAnalysisStatus(dataset.extId, "failed");
        console.log(`Dataset ${dataset.extId} (${i}) marked as failed.`);
      }
    }

    process.exit(0);
  });

program.parse();
