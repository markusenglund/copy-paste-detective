import { markdownTable } from "markdown-table";
import { DuplicateRow } from "../entities/DuplicateRow";
import { ExcelFileData } from "../types/ExcelFileData";
import { Sheet } from "../entities/Sheet";
import { RepeatedColumnSequence } from "../entities/RepeatedColumnSequence";
import { groupBy } from "lodash-es";
import { DuplicateRowsResult } from "../types/strategies";
import { RepeatedColumnSequencesResult } from "../types/strategies";

export async function reviewResults(
  excelFileData: ExcelFileData,
  duplicateRowsResult?: DuplicateRowsResult,
  duplicateColumnSequencesResult?: RepeatedColumnSequencesResult,
): Promise<void> {
  // Group issues by sheet

  const duplicateRowsBySheet = groupBy(
    duplicateRowsResult?.duplicateRows,
    "sheet.name",
  );
  const duplicateColumnSequencesBySheet = groupBy(
    duplicateColumnSequencesResult?.sequences,
    "sheet.name",
  );

  const minSizeAdjustedEntropyScore = 2;

  const promptInputs = excelFileData.sheets
    .map((sheet) => {
      const duplicateRows =
        duplicateRowsBySheet[sheet.name]?.toSorted(
          (a, b) =>
            b.matrixSizeAdjustedEntropyScore - a.matrixSizeAdjustedEntropyScore,
        ) ?? [];
      const duplicateColumnSequences =
        duplicateColumnSequencesBySheet[sheet.name]?.toSorted(
          (a, b) =>
            b.matrixSizeAdjustedEntropyScore - a.matrixSizeAdjustedEntropyScore,
        ) ?? [];
      return {
        sheet,
        duplicateRows,
        duplicateColumnSequences,
      };
    })
    .filter(
      (sheet) =>
        sheet.duplicateRows.length > 0 ||
        sheet.duplicateColumnSequences.length > 0,
    )
    .filter(
      (sheet) =>
        sheet.duplicateRows[0].matrixSizeAdjustedEntropyScore >
          minSizeAdjustedEntropyScore ||
        sheet.duplicateColumnSequences[0].matrixSizeAdjustedEntropyScore >
          minSizeAdjustedEntropyScore,
    );

  promptInputs.forEach((promptInput, index) => {
    const prompt = createPrompt(excelFileData, promptInput);

    // Use stdout directly so very long prompts are not truncated by util.inspect / console.log
    process.stdout.write(
      `\n\n================ Prompt ${index + 1} ================\n\n`,
    );
    process.stdout.write(prompt);
    process.stdout.write(
      `\n================ End of prompt ${index + 1} ================\n`,
    );
  });
}

const createPrompt = (
  excelFileData: ExcelFileData,
  promptInput: {
    sheet: Sheet;
    duplicateRows: DuplicateRow[];
    duplicateColumnSequences: RepeatedColumnSequence[];
  },
): string => {
  const {
    sheet,
    duplicateRows,
    duplicateColumnSequences: _duplicateColumnSequences,
  } = promptInput;
  let prompt = `The raw data belonging to a scientific paper  has been flagged by an automated system for containing duplicated data. Your job is to evaluate whether the duplication makes sense in the context of the paper or if it's likely the result of a data-handling mistake or even deliberate fraud. You'll receive the abstract of the paper, a description of the data and an abbreviated version of the data itself.

# Basic info

Title of the paper: ${excelFileData.articleName}
Excel filename: ${excelFileData.excelFileName}
Sheet name: ${sheet.name}
Number of rows: ${sheet.numRows}
`;

  if (excelFileData.abstract) {
    prompt += `
# Abstract

${excelFileData.abstract}
`;
  }

  prompt += `
# Description of the data

${excelFileData.dataDescription}
`;
  const numberOfSampleRows = 8;
  const columnNames = sheet.columnNames;
  const firstTenRows = sheet.getSampleData(numberOfSampleRows);
  const sampleTable = markdownTable([columnNames, ...firstTenRows]);

  prompt += `
# Data
Here are the first ${numberOfSampleRows} rows of the spreadsheet to help you understand the structure of the spreadsheet:

${sampleTable}
`;
  const numDuplicateRowSamples = 2;
  const duplicateRowSamples = duplicateRows.slice(0, numDuplicateRowSamples);
  if (duplicateRowSamples.length > 0) {
    prompt += `
And here are examples of row pairs with some duplicate cell values.
`;
  }
  for (const duplicateRow of duplicateRowSamples) {
    const [rowIndex1, rowIndex2] = duplicateRow.rowIndices;
    const duplicateRowTable = markdownTable([
      ["originalRowNumber", ...columnNames],
      [String(rowIndex1 + 1), ...sheet.getSampleRow(rowIndex1)],
      [String(rowIndex2 + 1), ...sheet.getSampleRow(rowIndex2)],
    ]);
    prompt += `
Rows ${rowIndex1 + 1} and ${rowIndex2 + 1}:
  
    ${duplicateRowTable}
    `;
  }
  prompt += `
# Instructions

Do you think these duplicated rows make sense in the context of the paper or do you think they could be a sign of a data-handling mistake or even deliberate fraud? Please include your reasoning.
`;

  return prompt;
};
