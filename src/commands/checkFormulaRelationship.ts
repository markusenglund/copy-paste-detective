import { Command } from "@commander-js/extra-typings";
import { closeDb } from "../db";
import {
  getDryadDatasetByExtId,
  getPmcDatasetByExtId,
  type DatasetWithFiles,
  type DryadDatasetWithFiles,
} from "../repositories/datasets/unifiedDatasetsRepository";
import {
  maxExcelFilesPerDatasetForFormulaCheck,
  maxSheetsPerExcelFileForFormulaCheck,
} from "../config/config";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { loadExcelFileFromPmcDataset } from "../utils/loadExcelFileFromPmcDataset";
import { ExcelFileData } from "../types/ExcelFileData";
import { logger } from "../utils/logger";
import {
  identifyFormulaRelationshipsWithCache,
  type IdentifyFormulaRelationshipsParams,
} from "../ai/useCases/identifyFormulaRelationships";
import { PythonRunner } from "../formulaCheck/pythonRunner";
import { type SheetColumnInfo } from "../formulaCheck/checkRelationship";
import { buildSheetColumnInfo } from "../formulaCheck/buildSheetColumnInfo";
import {
  runRelationshipLoop,
  type RelationshipLoopCallbacks,
} from "../formulaCheck/runRelationshipLoop";

const SAMPLE_ROW_COUNT = 5;
const MAX_FORMULA_RETRIES = 3;

function toColumnDisplayName(name: string): string {
  return name.trim() === "" ? "(empty header)" : name;
}

function formatExpressionWithColumnNames(
  expression: string,
  columnsByLetter: Map<string, SheetColumnInfo>,
): string {
  return expression.replace(/\b[A-Z]{1,3}\b/g, (token) => {
    const column = columnsByLetter.get(token.toUpperCase());
    if (!column) {
      return token;
    }
    return toColumnDisplayName(column.name);
  });
}

const program = new Command();

program
  .name("check-formula-relationship")
  .description(
    "Inspect sample rows from a Dryad or PMC dataset to identify formula relationships between columns.",
  )
  .argument(
    "<datasetExtId>",
    "Dataset external ID (numeric for Dryad, e.g. PMC7305608 for PMC)",
  )
  .action(async (datasetExtId) => {
    const python = await PythonRunner.start();
    try {
      const isPmc = datasetExtId.startsWith("PMC");

      let dryadDataset: DryadDatasetWithFiles | undefined;
      let pmcDataset: DatasetWithFiles | undefined;

      if (isPmc) {
        pmcDataset = await getPmcDatasetByExtId(datasetExtId);
      } else {
        dryadDataset = await getDryadDatasetByExtId(parseInt(datasetExtId, 10));
      }

      const dataset = pmcDataset ?? dryadDataset;

      if (!dataset) {
        logger.error(
          `Dataset with extId ${datasetExtId} not found in the database.`,
        );
        process.exit(1);
      }
      if (dataset.downloadStatus !== "completed") {
        logger.error(
          `Dataset with extId ${datasetExtId} is not downloaded. Status: ${dataset.downloadStatus}`,
        );
        process.exit(1);
      }

      const excelFiles = dataset.dataFiles.filter(
        (f) => f.fileType === "excel",
      );
      const filesToProcess = excelFiles.slice(
        0,
        maxExcelFilesPerDatasetForFormulaCheck,
      );

      for (let i = 0; i < filesToProcess.length; i++) {
        const fileEntry = filesToProcess[i];
        if (fileEntry.downloadStatus !== "completed") {
          logger.info(
            `Skipping additional file '${fileEntry.filename}' because it is not downloaded (status: ${fileEntry.downloadStatus}).`,
          );
          continue;
        }

        const excelFileData: ExcelFileData = pmcDataset
          ? loadExcelFileFromPmcDataset(
              pmcDataset,
              i,
              maxSheetsPerExcelFileForFormulaCheck,
            )
          : loadExcelFileFromDryadIndex(
              dryadDataset!,
              i,
              maxSheetsPerExcelFileForFormulaCheck,
            );

        for (const sheet of excelFileData.sheets) {
          logger.info(
            `\n=== File: ${fileEntry.filename} | Sheet: ${sheet.name} ===`,
          );

          const availableRows = sheet.numRows - sheet.firstDataRowIndex;
          if (availableRows <= 0) {
            logger.info("(no data rows)");
            continue;
          }

          const columns: SheetColumnInfo[] = buildSheetColumnInfo(sheet);

          const printableColumns = columns
            .filter((col) => col.name.trim() !== "")
            .map((col) =>
              col.isFormula
                ? `${col.letter} [FORMULA] (${col.name})`
                : `${col.letter} (${col.name})`,
            );
          logger.info(
            `Columns (${printableColumns.length}): ${printableColumns.join(" | ")}`,
          );

          const rowCount = Math.min(SAMPLE_ROW_COUNT, availableRows);
          const sampleRows = sheet.getSampleData(rowCount);

          const originalParams: IdentifyFormulaRelationshipsParams = {
            excelFileName: fileEntry.filename,
            sheetName: sheet.name,
            columns,
            sampleRows,
            datasetId: dataset.id,
            datasetFileId: fileEntry.id,
            articleName: excelFileData.articleName,
            abstract: excelFileData.abstract,
            dataDescription: excelFileData.dataDescription,
            fileCaption:
              excelFileData.source === "pmc"
                ? excelFileData.fileCaption
                : undefined,
            fullText:
              excelFileData.source === "pmc"
                ? excelFileData.fullText
                : undefined,
            source: excelFileData.source,
          };

          logger.info(
            `Waiting for AI formula relationship response for sheet '${sheet.name}'...`,
          );
          const aiRequestStart = Date.now();
          const initialAiResponse =
            await identifyFormulaRelationshipsWithCache(originalParams);
          const aiRequestDurationSeconds = (
            (Date.now() - aiRequestStart) /
            1000
          ).toFixed(1);
          logger.info(
            `AI response received for sheet '${sheet.name}' in ${aiRequestDurationSeconds}s.`,
          );

          if (initialAiResponse.explanation) {
            logger.info(`AI explanation: ${initialAiResponse.explanation}`);
          }

          if (initialAiResponse.relationships.length === 0) {
            logger.info("No formula relationships identified.");
            continue;
          }

          const columnsByLetter = new Map(
            columns.map((col) => [col.letter.toUpperCase(), col]),
          );

          const callbacks: RelationshipLoopCallbacks = {
            onAttemptStart: (attempt) => {
              if (attempt === 0) {
                logger.info("Identified formula relationships:");
              } else {
                logger.info(`Retry ${attempt} — checking revised formulas:`);
              }
            },
            beforeCheck: (rel) => {
              const resultColumn = columnsByLetter.get(
                rel.resultColumn.toUpperCase(),
              );
              const resultName = resultColumn
                ? toColumnDisplayName(resultColumn.name)
                : "(unknown column)";
              const letter = resultColumn?.letter ?? rel.resultColumn;
              const expressionWithNames = formatExpressionWithColumnNames(
                rel.expression,
                columnsByLetter,
              );
              logger.info(
                `- ${letter} (${resultName}) = ${rel.expression} [${resultName} = ${expressionWithNames}]`,
              );
            },
            afterCheck: (_rel, result) => {
              logger.info(
                `  rows: ${result.totalRows} total | ${result.passedRows} passed | ${result.failedRows} failed | ${result.skippedRows} skipped`,
              );
              if (result.topFailures.length > 0) {
                logger.info("  top failures:");
                for (const failure of result.topFailures) {
                  const expectedPart =
                    failure.expected === null
                      ? `expected=(eval error: ${failure.errorMessage ?? "unknown"})`
                      : `expected=${failure.expected}`;
                  logger.info(
                    `    - row ${failure.rowIndex + 1}: observed=${failure.observed}, ${expectedPart}, absError=${failure.absError}`,
                  );
                }
              }
              if (result.passedRows > 0 && result.failedRows === 0) {
                logger.info(`  All rows pass — formula confirmed.`);
              } else if (result.passedRows === 0 && result.failedRows > 0) {
                logger.info(`  All rows failed.`);
              } else {
                logger.info(`  Mixed results — some rows pass, some fail.`);
              }
            },
            onAllConfirmed: () => {
              logger.info("All formula relationships confirmed.");
            },
            onMaxRetriesReached: (count) => {
              logger.info(
                `${count} formula(s) could not be confirmed after ${MAX_FORMULA_RETRIES} retries.`,
              );
            },
            onRevisitStart: (count) => {
              logger.info(
                `${count} formula(s) unconfirmed — asking AI to revise...`,
              );
            },
            onRevisitDone: (response, durationMs) => {
              logger.info(
                `AI revisit received in ${(durationMs / 1000).toFixed(1)}s. Explanation: ${response.explanation}`,
              );
            },
          };

          await runRelationshipLoop({
            initialAiResponse,
            originalParams,
            sheet,
            columns,
            python,
            datasetId: dataset.id,
            datasetFileId: fileEntry.id,
            maxRetries: MAX_FORMULA_RETRIES,
            callbacks,
          });
        }
      }
    } finally {
      await python.shutdown();
      await closeDb();
    }
  });

program.parse();
