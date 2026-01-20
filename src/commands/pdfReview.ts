import { Command } from "@commander-js/extra-typings";
import { parseIntArgument } from "../utils/command";
import { getHighSuspicionReviewsWithArticles } from "../repositories/aiReviewResults/aiReviewResultsRepository";
import { loadPdfFile } from "../utils/loadPdfForGemini";
import { createPdfReviewPrompt } from "../pdfReview/createPdfReviewPrompt";
import { reviewPdfWithCache } from "../ai/geminiService";
import { logger } from "../utils/logger";
import { closeDb } from "../db";

const program = new Command();

const SUSPICION_THRESHOLD = 5;

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
  .option("--extId <number>", "Update a specific dataset by extId", parseInt)
  .action(async (options) => {
    let successCount = 0;
    let failedCount = 0;

    try {
      const filterMessage = options.extId
        ? ` for dataset extId ${options.extId}`
        : "";
      logger.info(
        `Fetching up to ${options.limit} high-suspicion reviews (suspicion score > ${SUSPICION_THRESHOLD})${filterMessage}...`,
      );

      const reviews = await getHighSuspicionReviewsWithArticles(
        SUSPICION_THRESHOLD,
        options.limit,
        options.extId,
      );

      logger.info(`Found ${reviews.length} reviews to process`);

      for (const {
        aiReview,
        article,
        pdfFile,
        dataset,
        excelFile,
      } of reviews) {
        try {
          logger.info(`Processing article ${article.id}: ${article.title}`);

          // Load PDF file
          const pdfData = await loadPdfFile({
            articleId: article.id,
            filename: pdfFile.filename,
          });

          logger.info(
            `Loaded PDF: ${pdfFile.filename} (${pdfFile.size} bytes)`,
          );

          // Create conversation structure for multi-turn prompt
          const conversation = createPdfReviewPrompt({
            originalPrompt: aiReview.prompt,
            articleTitle: article.title,
            articleAbstract: dataset.abstract ?? undefined,
            excelFileName: excelFile.filename,
            sheetName: aiReview.sheetName,
            originalAiReview: {
              explanation: aiReview.explanation,
              falsePositiveTheory: aiReview.falsePositiveTheory,
              suspicionScore: aiReview.suspicionScore,
              impactScore: aiReview.impactScore,
            },
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

          // Log results (truncated)

          logger.info(`Analysis: ${pdfReview.response}`);
          logger.info(
            `Previous suspicion score: ${aiReview.suspicionScore}/10`,
          );
          logger.info(`Impact Score: ${pdfReview.impactScore}/10`);

          successCount++;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(
            `Failed to process article ${article.id}: ${errorMessage}`,
          );
          failedCount++;
        }
      }

      logger.info(`Complete. Success: ${successCount}, Failed: ${failedCount}`);
    } finally {
      await closeDb();
    }
  });

program.parse();
