import { markdownTable } from "markdown-table";
import fs from "node:fs";
import path from "node:path";
import { DuplicateRow } from "../entities/DuplicateRow";
import { ExcelFileData } from "../types/ExcelFileData";
import { Sheet } from "../entities/Sheet";
import { RepeatedColumnSequence } from "../entities/RepeatedColumnSequence";
import { groupBy } from "lodash-es";
import { DuplicateRowsResult } from "../types/strategies";
import { RepeatedColumnSequencesResult } from "../types/strategies";
import { SuspicionLevel } from "../types";

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
    "sheetName",
  );

  const promptInputs = excelFileData.sheets
    .map((sheet) => {
      const duplicateRows =
        duplicateRowsBySheet[sheet.name]
          ?.filter((duplicateRow) =>
            [SuspicionLevel.Medium, SuspicionLevel.High].includes(
              duplicateRow.suspicionLevel,
            ),
          )
          .toSorted(
            (a, b) =>
              b.matrixSizeAdjustedEntropyScore -
              a.matrixSizeAdjustedEntropyScore,
          ) ?? [];
      const duplicateColumnSequences =
        duplicateColumnSequencesBySheet[sheet.name]
          ?.filter((columnSequence) =>
            [SuspicionLevel.Medium, SuspicionLevel.High].includes(
              columnSequence.suspicionLevel,
            ),
          )
          .toSorted(
            (a, b) =>
              b.matrixSizeAdjustedEntropyScore -
              a.matrixSizeAdjustedEntropyScore,
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
    );

  promptInputs.forEach((promptInput, index) => {
    // Prepare output file (in project root, append all prompts)
    const outputFilePath = path.resolve(`tmp/prompts_${index}.md`);
    // Overwrite any existing file at the start of a run
    const prompt = createPrompt(excelFileData, promptInput);

    fs.writeFileSync(outputFilePath, prompt, "utf8");
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
  const { sheet, duplicateRows, duplicateColumnSequences } = promptInput;
  let prompt = `The raw data belonging to a scientific paper has been flagged by an automated system for containing duplicated data. Your job is to evaluate whether the duplication makes sense in the context of the paper or if it's likely the result of a data-handling mistake or even deliberate fraud. You'll receive the abstract of the paper, a description of the data and an abbreviated version of the data itself.

# Basic info

- Title of the paper: ${excelFileData.articleName}
- Excel filename: ${excelFileData.excelFileName}
- Sheet name: ${sheet.name}
- Number of rows in sheet: ${sheet.numRows}
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
  if (duplicateRows.length > 0) {
    const numDuplicateRowSamples = 6;
    const duplicateRowSamples = duplicateRows.slice(0, numDuplicateRowSamples);
    prompt += `

### Row pairs with duplicate cell values

`;
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
  }

  if (duplicateColumnSequences.length > 0) {
    const numDuplicateColumnSequenceSamples = 2;
    const duplicateColumnSequenceSamples = duplicateColumnSequences.slice(
      0,
      numDuplicateColumnSequenceSamples,
    );
    prompt += `
### Duplicated vertical sequences of cells

Here are examples of pairs of vertical sequences of cells that are perfect duplicates.
`;
    for (const duplicateColumnSequence of duplicateColumnSequenceSamples) {
      const { sequences, values } = duplicateColumnSequence;
      console.log(duplicateColumnSequence);
      const sequence1StartRowNumber = sequences[0].startRowIndex + 1;
      const sequence1EndRowNumber = sequences[0].startRowIndex + values.length;
      const sequence1ColumnName = sequences[0].column.name;
      const sequence2StartRowNumber = sequences[1].startRowIndex + 1;
      const sequence2EndRowNumber = sequences[1].startRowIndex + values.length;
      const sequence2ColumnName = sequences[1].column.name;
      prompt += `
The sequence of ${duplicateColumnSequence.values.length} values from row ${sequence1StartRowNumber} to ${sequence1EndRowNumber} of the column '${sequence1ColumnName}' is the same as the sequence from row ${sequence2StartRowNumber} to ${sequence2EndRowNumber} of the column '${sequence2ColumnName}'.

`;
    }
  }

  prompt += `
# Instructions

Do you think these duplicated rows make sense in the context of the paper or do you think they could be a sign of a data-handling mistake or even deliberate fraud? Please include your reasoning.
`;

  return prompt;
};
