import { Command } from "@commander-js/extra-typings";
import xlsx from "xlsx";
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
import { identifyFormulaRelationshipsWithCache } from "../ai/useCases/identifyFormulaRelationships";
import { PythonRunner } from "../formulaCheck/pythonRunner";
import {
  checkRelationship,
  type SheetColumnInfo,
} from "../formulaCheck/checkRelationship";

const SAMPLE_ROW_COUNT = 5;
const FORMULA_COLUMN_THRESHOLD = 0.5;

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

          const columns: SheetColumnInfo[] = sheet.columnNames.map(
            (columnName, colIndex) => {
              let nonEmptyCount = 0;
              let formulaCount = 0;
              for (
                let rowIndex = sheet.firstDataRowIndex;
                rowIndex < sheet.numRows;
                rowIndex++
              ) {
                const cell = sheet.enhancedMatrix[rowIndex]?.[colIndex];
                const value = cell?.value;
                const isNonEmpty =
                  value !== null &&
                  value !== undefined &&
                  !(typeof value === "string" && value.trim() === "");
                if (!isNonEmpty) {
                  continue;
                }
                nonEmptyCount++;
                if (cell.originalCell?.f !== undefined) {
                  formulaCount++;
                }
              }

              const ratio =
                nonEmptyCount === 0 ? 0 : formulaCount / nonEmptyCount;
              return {
                letter: xlsx.utils.encode_col(colIndex),
                name: columnName,
                isFormula: ratio > FORMULA_COLUMN_THRESHOLD,
              };
            },
          );

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

          logger.info(
            `Waiting for AI formula relationship response for sheet '${sheet.name}'...`,
          );
          const aiRequestStart = Date.now();
          const relationshipResult =
            await identifyFormulaRelationshipsWithCache({
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
            });
          const aiRequestDurationSeconds = (
            (Date.now() - aiRequestStart) /
            1000
          ).toFixed(1);
          logger.info(
            `AI response received for sheet '${sheet.name}' in ${aiRequestDurationSeconds}s.`,
          );

          if (relationshipResult.explanation) {
            logger.info(`AI explanation: ${relationshipResult.explanation}`);
          }

          if (relationshipResult.relationships.length === 0) {
            logger.info("No formula relationships identified.");
            continue;
          }

          const columnsByLetter = new Map(
            columns.map((col) => [col.letter.toUpperCase(), col]),
          );

          logger.info("Identified formula relationships:");
          for (const relationship of relationshipResult.relationships) {
            const resultColumn = columnsByLetter.get(
              relationship.resultColumn.toUpperCase(),
            );
            if (!resultColumn) {
              logger.info(
                `- ${relationship.resultColumn} (unknown column) = ${relationship.expression}`,
              );
              continue;
            }

            if (resultColumn.isFormula) {
              logger.info(
                `- Skipping ${resultColumn.letter} because it is a [FORMULA] column`,
              );
              continue;
            }

            const resultName = toColumnDisplayName(resultColumn.name);
            const expressionWithNames = formatExpressionWithColumnNames(
              relationship.expression,
              columnsByLetter,
            );
            logger.info(
              `- ${resultColumn.letter} (${resultName}) = ${relationship.expression} [${resultName} = ${expressionWithNames}]`,
            );

            const checkResult = await checkRelationship(
              sheet,
              columns,
              relationship,
              python,
            );
            logger.info(
              `  Checking: ${resultColumn.letter} (${resultName}) = ${relationship.expression}`,
            );
            logger.info(
              `    rows: ${checkResult.totalRows} total | ${checkResult.passedRows} passed | ${checkResult.failedRows} failed | ${checkResult.skippedRows} skipped`,
            );
            if (checkResult.topFailures.length > 0) {
              logger.info("    top failures:");
              for (const failure of checkResult.topFailures) {
                const expectedPart = Number.isFinite(failure.expectedMin)
                  ? `expected=[${failure.expectedMin}, ${failure.expectedMax}]`
                  : `expected=(eval error: ${failure.errorMessage ?? "unknown"})`;
                logger.info(
                  `      - row ${failure.rowIndex + 1}: observed=${failure.observed} (interval [${failure.observedMin}, ${failure.observedMax}]), ${expectedPart}, absError=${failure.absError}`,
                );
              }
            }
          }
        }
      }
    } finally {
      await python.shutdown();
      await closeDb();
    }
  });

program.parse();
