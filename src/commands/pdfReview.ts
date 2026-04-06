import { Command } from "@commander-js/extra-typings";
import pMap from "p-map";
import { parseIntArgument } from "../utils/command";
import { getDatasetsForPdfReview } from "../repositories/aiReviewResults/aiReviewResultsRepository";
import { updateDatasetAnalysisStatus } from "../repositories/datasets/unifiedDatasetsRepository";
import { loadPdfFile } from "../utils/loadPdfForGemini";
import { createPdfReviewPrompt } from "../pdfReview/createPdfReviewPrompt";
import { reviewPdfWithCache } from "../ai/useCases/reviewPdf";
import { logger } from "../utils/logger";
import { closeDb } from "../db";

const program = new Command();

const SUSPICION_THRESHOLD = 0.5;

program
  .name("pdf-review")
  .description("Review PDF files for articles connected to suspicious datasets")
  .version("0.1.0")
  .option(
    "--limit <number>",
    "Maximum number of PDFs to review",
    parseIntArgument,
    1,
  )
  .option(
    "--extId <number>",
    "Get reviews for a specific dataset by extId",
    parseInt,
  )
  .action(async (options) => {
    let successCount = 0;
    let failedCount = 0;
    let datasetsProcessed = 0;

    try {
      const filterMessage = options.extId
        ? ` for dataset extId ${options.extId}`
        : "";
      logger.info(
        `Fetching up to ${options.limit} datasets with high-suspicion reviews (probability > ${SUSPICION_THRESHOLD * 100}%)${filterMessage}...`,
      );

      const datasetsWithReviews = await getDatasetsForPdfReview(
        SUSPICION_THRESHOLD,
        options.limit,
        options.extId,
      );

      const totalReviews = datasetsWithReviews.reduce(
        (sum, d) => sum + d.reviews.length,
        0,
      );
      logger.info(
        `Found ${datasetsWithReviews.length} datasets with ${totalReviews} reviews to process`,
      );

      await pMap(
        datasetsWithReviews,
        async ({ dataset, article, pdfFile, reviews }) => {
          logger.info(
            `Processing dataset id=${dataset.id} extId=${dataset.extId}: ${dataset.title} (${reviews.length} reviews)`,
          );

          // Load PDF file once per dataset
          const pdfData = await loadPdfFile({
            articleId: article.id,
            filename: pdfFile.filename,
          });

          logger.info(
            `Loaded PDF: ${article.id}/${pdfFile.filename} (${pdfFile.size} bytes)`,
          );

          for (const { aiReview, datasetFile: excelFile } of reviews) {
            try {
              logger.info(
                `Processing review for ${excelFile.filename} / ${aiReview.sheetName}`,
              );

              // Create conversation structure for multi-turn prompt
              const conversation = createPdfReviewPrompt({
                originalPrompt: aiReview.prompt,
                articleTitle: article.title,
                articleAbstract: dataset.abstract ?? undefined,
                excelFileName: excelFile.filename,
                sheetName: aiReview.sheetName,
                originalAiReview: aiReview.response,
              });

              // Call AI with caching
              logger.info("Calling AI for PDF review...");
              const pdfReview = await reviewPdfWithCache({
                conversation,
                pdfBuffer: pdfData.fileBuffer,
                pdfFileName: pdfFile.filename,
                aiReviewResultId: aiReview.id,
                articleId: article.id,
              });

              // Log results
              logger.info(`Analysis: ${pdfReview.response}`);
              logger.info(
                `Previous probability of real issues: ${(aiReview.truePositiveProbability * 100).toFixed(0)}%`,
              );
              logger.info(`Impact Score: ${pdfReview.impactScore}/5`);

              successCount++;
            } catch (err) {
              const errorMessage =
                err instanceof Error ? err.message : String(err);
              logger.error(
                `Failed to process review for ${excelFile.filename} / ${aiReview.sheetName}: ${errorMessage}`,
              );
              failedCount++;
            }
          }

          // Mark dataset as pdf_reviewed_by_ai after processing all its reviews
          await updateDatasetAnalysisStatus(dataset.id, "pdf_reviewed_by_ai");
          datasetsProcessed++;
          logger.info(`Dataset ${dataset.extId} marked as pdf_reviewed_by_ai`);
        },
        { concurrency: 5 },
      );

      logger.info(
        `Complete. Datasets: ${datasetsProcessed}, Reviews - Success: ${successCount}, Failed: ${failedCount}`,
      );
    } finally {
      await closeDb();
    }
  });

program.parse();
