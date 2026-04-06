import { Command } from "@commander-js/extra-typings";
import { getDryadDatasetByExtId } from "../repositories/datasets/unifiedDatasetsRepository";
import { getDatasetDetails } from "../server/services/datasetDetailsService";
import { parseIntArgument } from "../utils/command";
import { logger } from "../utils/logger";
import { closeDb } from "../db";
import { mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { storagePaths } from "../utils/paths/storagePaths";

const program = new Command();

program
  .name("create-casefile")
  .description(
    "Compile all important files and info about a dataset into a casefile folder",
  )
  .version("0.1.0")
  .argument("<extId>", "Dryad dataset external ID", parseIntArgument)
  .action(async (extId) => {
    try {
      logger.info(`Looking up dataset with extId ${extId}...`);
      const dataset = await getDryadDatasetByExtId(extId);
      if (!dataset) {
        logger.error(`Dataset with extId ${extId} not found`);
        return;
      }

      const details = await getDatasetDetails(dataset.id);
      if (!details) {
        logger.error(
          `No dataset details found for extId ${extId} (no valid reviews)`,
        );
        return;
      }

      const outputDir = join(process.cwd(), "casefiles", extId.toString());
      await mkdir(outputDir, { recursive: true });
      logger.info(`Created casefile folder: ${outputDir}`);

      // A. Copy PDF file
      if (details.article.id && details.article.pdfFilename) {
        const pdfSource = join(
          storagePaths.pdfArticle(details.article.id),
          details.article.pdfFilename,
        );
        if (existsSync(pdfSource)) {
          const pdfDest = join(outputDir, details.article.pdfFilename);
          await copyFile(pdfSource, pdfDest);
          logger.info(`Copied PDF: ${details.article.pdfFilename}`);
        } else {
          logger.warn(`PDF not found at ${pdfSource}`);
        }
      } else {
        logger.warn("No PDF filename available for this dataset");
      }

      // Filter to only suspicious reviews (>50% probability)
      const suspiciousReviews = details.sheetReviews.filter(
        (r) => r.aiReview.truePositiveProbability > 0.5,
      );

      if (suspiciousReviews.length === 0) {
        logger.warn("No reviews with >50% suspicion probability found");
      }

      // Collect unique Excel filenames from suspicious reviews
      const suspiciousExcelFiles = new Set(
        suspiciousReviews.map((r) => r.excelFileName),
      );

      // B. Copy original Excel files (only for suspicious sheets)
      const originalDir = storagePaths.dryadDataset(extId);
      if (existsSync(originalDir)) {
        for (const file of suspiciousExcelFiles) {
          const sourcePath = join(originalDir, file);
          if (existsSync(sourcePath)) {
            await copyFile(sourcePath, join(outputDir, file));
            logger.info(`Copied original Excel: ${file}`);
          } else {
            logger.warn(`Original Excel file not found: ${file}`);
          }
        }
      } else {
        logger.warn(`No original files folder found for extId ${extId}`);
      }

      // C. Copy highlighted Excel files (only for suspicious sheets)
      const highlightedDir = storagePaths.highlightedDataset(extId);
      if (existsSync(highlightedDir)) {
        for (const originalName of suspiciousExcelFiles) {
          const highlightedName = originalName.endsWith(".xls")
            ? originalName.replace(".xls", ".xlsx")
            : originalName;
          const sourcePath = join(highlightedDir, highlightedName);
          if (existsSync(sourcePath)) {
            const destName = `highlighted-${highlightedName}`;
            await copyFile(sourcePath, join(outputDir, destName));
            logger.info(`Copied highlighted Excel: ${destName}`);
          }
        }
      } else {
        logger.warn(`No highlighted output folder found for extId ${extId}`);
      }

      // D. Generate review and prompt .md files (only for suspicious sheets)
      for (const review of suspiciousReviews) {
        const sanitizedFileName = review.excelFileName.replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );
        const sanitizedSheetName = review.sheetName.replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );
        const baseName = `${sanitizedFileName}-${sanitizedSheetName}`;

        // Review file
        const mdFilename = `review-${baseName}.md`;
        const mdPath = join(outputDir, mdFilename);

        let content = `# AI Review: ${review.excelFileName} - ${review.sheetName}\n\n`;
        content += `- **Model:** ${review.aiReview.model}\n`;
        content += `- **Suspicion probability:** ${review.aiReview.truePositiveProbability}\n`;
        content += `- **Date:** ${formatDate(review.aiReview.createdAt)}\n\n`;
        content += `${review.aiReview.response}\n`;

        if (review.pdfReview) {
          content += `\n# PDF Review\n\n`;
          content += `- **Model:** ${review.pdfReview.model}\n`;
          content += `- **Impact score:** ${review.pdfReview.impactScore}\n`;
          content += `- **Date:** ${formatDate(review.pdfReview.createdAt)}\n\n`;
          content += `\n${review.pdfReview.response}\n`;
        }

        await writeFile(mdPath, content);
        logger.info(`Generated review: ${mdFilename}`);

        // Prompt file
        const promptFilename = `prompt-${baseName}.md`;
        const promptPath = join(outputDir, promptFilename);
        await writeFile(promptPath, review.aiReview.prompt);
        logger.info(`Generated prompt: ${promptFilename}`);
      }

      // E. Generate info.md
      const infoPath = join(outputDir, "info.md");
      let info = `- **Title:** ${details.article.title}\n\n`;
      info += `- **Journal:** ${details.article.journalName ?? "Unknown"}\n`;
      info += `- **SJR score:** ${details.article.journalSjrScore ?? "N/A"}\n`;
      info += `- **Publication date:** ${details.article.publicationDate ? formatDate(details.article.publicationDate) : "N/A"}\n`;
      info += `- **Citations:** ${details.article.citations ?? "N/A"}\n`;

      if (details.article.authors.length > 0) {
        info += `\n**Authors:**\n`;
        for (const author of details.article.authors) {
          info += `- ${author.name}`;
          if (author.institution) {
            info += ` (${author.institution})`;
          }
          info += `\n`;
        }
        info += `\n`;
      }

      info += `\n**Links:**\n`;
      info += `- Dryad: https://datadryad.org/stash/dataset/doi:${details.dataset.doi}\n`;
      if (details.article.doi) {
        info += `- Article: https://doi.org/${details.article.doi}\n`;
      }

      await writeFile(infoPath, info);
      logger.info("Generated info.md");

      logger.info(`Casefile created successfully at ${outputDir}`);
    } finally {
      await closeDb();
    }
  });

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

program.parse();
