import { Command } from "@commander-js/extra-typings";
import { getDatasetByExtId } from "../repositories/datasets/datasetsRepository";
import { getDatasetDetails } from "../server/services/datasetDetailsService";
import { parseIntArgument } from "../utils/command";
import { logger } from "../utils/logger";
import { closeDb } from "../db";
import { mkdir, copyFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";

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
      const dataset = await getDatasetByExtId(extId);
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
          process.cwd(),
          "data",
          "pdfs",
          details.article.id.toString(),
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

      // B. Copy original Excel files
      const originalDir = join(
        process.cwd(),
        "data",
        "dryad",
        "files",
        extId.toString(),
      );
      if (existsSync(originalDir)) {
        const files = await readdir(originalDir);
        for (const file of files) {
          await copyFile(join(originalDir, file), join(outputDir, file));
          logger.info(`Copied original Excel: ${file}`);
        }
      } else {
        logger.warn(`No original files folder found for extId ${extId}`);
      }

      // C. Copy highlighted Excel files (prefixed to avoid collisions with originals)
      const highlightedDir = join(
        process.cwd(),
        "highlighted-output",
        extId.toString(),
      );
      if (existsSync(highlightedDir)) {
        const files = await readdir(highlightedDir);
        const xlsxFiles = files.filter((f) => f.endsWith(".xlsx"));
        for (const file of xlsxFiles) {
          const destName = `highlighted-${file}`;
          await copyFile(join(highlightedDir, file), join(outputDir, destName));
          logger.info(`Copied highlighted Excel: ${destName}`);
        }
      } else {
        logger.warn(`No highlighted output folder found for extId ${extId}`);
      }

      // C. Generate review .md files
      for (const review of details.sheetReviews) {
        const sanitizedFileName = review.excelFileName.replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );
        const sanitizedSheetName = review.sheetName.replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );
        const mdFilename = `review-${sanitizedFileName}-${sanitizedSheetName}.md`;
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
      }

      // D. Generate info.md
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
