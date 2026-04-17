import { Command } from "@commander-js/extra-typings";
import xlsx from "xlsx";
import { closeDb } from "../db";
import { getDryadDatasetByExtId } from "../repositories/datasets/unifiedDatasetsRepository";
import { maxExcelFilesPerDataset } from "../config/config";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { parseIntArgument } from "../utils/command";
import { logger } from "../utils/logger";
import { identifyFormulaRelationshipsWithCache } from "../ai/useCases/identifyFormulaRelationships";

const SAMPLE_ROW_COUNT = 5;
const FORMULA_COLUMN_THRESHOLD = 0.5;

type SheetColumnInfo = {
  letter: string;
  name: string;
  isFormula: boolean;
};

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
    "Inspect sample rows from a Dryad dataset to identify formula relationships between columns.",
  )
  .argument("<datasetExtId>", "Dryad dataset external ID", parseIntArgument)
  .action(async (datasetExtId) => {
    try {
      const dataset = await getDryadDatasetByExtId(datasetExtId);
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
      const filesToProcess = excelFiles.slice(0, maxExcelFilesPerDataset);

      for (let i = 0; i < filesToProcess.length; i++) {
        const fileEntry = filesToProcess[i];
        if (fileEntry.downloadStatus !== "completed") {
          logger.info(
            `Skipping additional file '${fileEntry.filename}' because it is not downloaded (status: ${fileEntry.downloadStatus}).`,
          );
          continue;
        }

        const excelFileData = loadExcelFileFromDryadIndex(dataset, i);

        for (const sheet of excelFileData.sheets) {
          console.log(
            `File: '${fileEntry.filename}'\nSheet: ${sheet.name} `,
          );

          const availableRows = sheet.numRows - sheet.firstDataRowIndex;
          if (availableRows <= 0) {
            console.log("(no data rows)");
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

          const printableColumns = columns.map((col) => {
            const name = toColumnDisplayName(col.name);
            return col.isFormula
              ? `${col.letter} [FORMULA] (${name})`
              : `${col.letter} (${name})`;
          });
          console.log(
            `Columns (${columns.length}): ${printableColumns.join(" | ")}`,
          );
          console.log();

          const rowCount = Math.min(SAMPLE_ROW_COUNT, availableRows);
          const sampleRows = sheet.getSampleData(rowCount);


          const relationshipResult =
            await identifyFormulaRelationshipsWithCache({
              excelFileName: fileEntry.filename,
              sheetName: sheet.name,
              columns,
              sampleRows,
              datasetId: dataset.id,
              datasetFileId: fileEntry.id,
            });

          if (relationshipResult.relationships.length === 0) {
            console.log("No formula relationships identified.");
            continue;
          }

          const columnsByLetter = new Map(
            columns.map((col) => [col.letter.toUpperCase(), col]),
          );

          console.log("Identified formula relationships:");
          for (const relationship of relationshipResult.relationships) {
            const resultColumn = columnsByLetter.get(
              relationship.resultColumn.toUpperCase(),
            );
            if (!resultColumn) {
              console.log(
                `- ${relationship.resultColumn} (unknown column) = ${relationship.expression}`,
              );
              continue;
            }

            if (resultColumn.isFormula) {
              console.log(
                `- Skipping ${resultColumn.letter} because it is a [FORMULA] column`,
              );
              continue;
            }

            const resultName = toColumnDisplayName(resultColumn.name);
            const expressionWithNames = formatExpressionWithColumnNames(
              relationship.expression,
              columnsByLetter,
            );
            console.log(
              `- ${resultColumn.letter} (${resultName}) = ${relationship.expression} [${resultName} = ${expressionWithNames}]`,
            );
          }
        }
      }
    } finally {
      await closeDb();
    }
  });

program.parse();
