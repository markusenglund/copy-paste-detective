import { Command } from "@commander-js/extra-typings";
import { db as analysisResultsDb } from "../dryad/analysisResultsDb";
import {
  AiReviewResultRow,
  getLatestReviewsPerSheet,
} from "../repositories/aiReviewResults/aiReviewResultsRepository";
import { getDatasetsByDownloadStatusWithFiles } from "../repositories/datasets/datasetsRepository";
import {
  getJournalsByIssnMap,
  formatIssn,
} from "../repositories/journals/journalsRepository";
import { logger } from "../utils/logger";
import { closeDb } from "../db";

const program = new Command();

program
  .name("dryad-report")
  .description("Print a list of analyzed datasets ranked by suspicion level.")
  .version("0.1.0")
  .action(async () => {
    try {
      // Get all completed (downloaded) datasets
      const completedDatasets = await getDatasetsByDownloadStatusWithFiles(
        "completed",
        10000,
      );
      const datasetByExtId = new Map(
        completedDatasets.map((dataset) => [dataset.extId, dataset]),
      );
      // Map internal dataset ID to extId for AI review lookups
      const extIdByInternalId = new Map(
        completedDatasets.map((dataset) => [dataset.id, dataset.extId]),
      );

      const journalByIssn = await getJournalsByIssnMap();

      // Get latest AI reviews per sheet, grouped by internal dataset ID
      const aiReviewsByDatasetId = await getLatestReviewsPerSheet();

      // Convert to a map by extId and find the most suspicious sheet per dataset
      const mostSuspiciousSheetByExtId = new Map<
        number,
        AiReviewResultRow | null
      >();
      for (const [internalId, reviews] of aiReviewsByDatasetId) {
        const extId = extIdByInternalId.get(internalId);
        if (extId === undefined) continue;

        // Find the most suspicious sheet (highest suspicionScore, then impactScore)
        const mostSuspicious = reviews.toSorted((a, b) => {
          if (b.suspicionScore !== a.suspicionScore) {
            return b.suspicionScore - a.suspicionScore;
          }
          return b.impactScore - a.impactScore;
        })[0];

        mostSuspiciousSheetByExtId.set(extId, mostSuspicious ?? null);
      }

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

          const aiReview =
            mostSuspiciousSheetByExtId.get(Number(extId)) ?? null;

          return {
            extId,
            title: dataset?.title,
            files,
            mostSuspiciousFile,
            journal,
            aiReview,
          };
        });

      // Sort datasets: AI-reviewed first (by suspicionScore, then impactScore),
      // then non-AI-reviewed (by entropy score)
      const sortedDatasets = datasets.toSorted((a, b) => {
        const aHasAiReview = a.aiReview !== null;
        const bHasAiReview = b.aiReview !== null;

        // AI-reviewed datasets come first
        if (aHasAiReview && !bHasAiReview) return -1;
        if (!aHasAiReview && bHasAiReview) return 1;

        // Both have AI reviews: sort by suspicionScore, then impactScore
        if (aHasAiReview && bHasAiReview) {
          if (b.aiReview!.suspicionScore !== a.aiReview!.suspicionScore) {
            return b.aiReview!.suspicionScore - a.aiReview!.suspicionScore;
          }
          return b.aiReview!.impactScore - a.aiReview!.impactScore;
        }

        // Neither has AI review: sort by entropy score
        return (
          b.mostSuspiciousFile.highestEntropyScore -
          a.mostSuspiciousFile.highestEntropyScore
        );
      });

      const topDatasets = sortedDatasets.slice(0, 100);

      logger.info(`Found ${topDatasets.length} analyzed datasets.`);
      console.table(
        topDatasets.map((dataset) => ({
          extId: dataset.extId,
          articleName: dataset.title?.slice(0, 40),
          fileName: dataset.mostSuspiciousFile.fileName.slice(0, 30),
          suspicionScore: dataset.aiReview?.suspicionScore ?? "-",
          impactScore: dataset.aiReview?.impactScore ?? "-",
          entropyScore:
            dataset.mostSuspiciousFile.highestEntropyScore.toFixed(2),
          journalScore: dataset.journal?.sjrScore,
          journal: dataset.journal?.title?.slice(0, 32),
        })),
      );
    } finally {
      await closeDb();
    }
  });

program.parse();
