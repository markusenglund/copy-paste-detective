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
import { DuplicateValuesResult, SuspicionLevel } from "../types";
import { CategorizedColumn } from "../columnCategorization/columnCategorization";
import { slugify } from "../utils/slugify";
import { maxPromptDataDescriptionChars, maxNumRowsToAnalyze } from "../config";
import { wrapInCodeBlock } from "../utils/markdown";

export async function reviewResults({
  excelFileData,
  categorizedColumnsBySheet,
  duplicateRowsResult,
  repeatedColumnSequencesResult,
  duplicateValuesResultsBySheet,
}: {
  excelFileData: ExcelFileData;
  categorizedColumnsBySheet: Map<string, CategorizedColumn[]>;
  duplicateRowsResult?: DuplicateRowsResult;
  repeatedColumnSequencesResult?: RepeatedColumnSequencesResult;
  duplicateValuesResultsBySheet: Map<string, DuplicateValuesResult>;
}): Promise<void> {
  // Group issues by sheet
  const duplicateRowsBySheet = groupBy(
    duplicateRowsResult?.duplicateRows,
    "sheet.name",
  );
  const duplicateColumnSequencesBySheet = groupBy(
    repeatedColumnSequencesResult?.sequences,
    "sheetName",
  );

  const promptInputs = excelFileData.sheets
    .map((sheet) => {
      const categorizedColumns = categorizedColumnsBySheet.get(sheet.name);
      if (!categorizedColumns) {
        throw new Error(
          `Unexpectedly missing categorized columns for sheet ${sheet.name}`,
        );
      }

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

      const duplicateValuesResult = duplicateValuesResultsBySheet.get(
        sheet.name,
      );
      if (!duplicateValuesResult) {
        throw new Error(
          `Sheet '${sheet.name}' unexpectedly lacks duplicate values result, something has gone wrong...`,
        );
      }
      const { numOccurrencesByNumericValue } = duplicateValuesResult;
      return {
        sheet,
        duplicateRows,
        duplicateColumnSequences,
        categorizedColumns,
        numOccurrencesByNumericValue,
      };
    })
    .filter(
      (sheet) =>
        sheet.duplicateRows.length > 0 ||
        sheet.duplicateColumnSequences.length > 0,
    );

  promptInputs.forEach((promptInput, index) => {
    // Prepare output file (in project root, append all prompts)
    const outputFilePath = path.resolve(
      `tmp/prompts_${slugify(excelFileData.articleName)}_${index}.md`,
    );
    // Overwrite any existing file at the start of a run
    const prompt = createPrompt(excelFileData, promptInput);

    fs.writeFileSync(outputFilePath, prompt, "utf8");
  });
}

const createPrompt = (
  excelFileData: ExcelFileData,
  promptInput: {
    sheet: Sheet;
    categorizedColumns: CategorizedColumn[];
    numOccurrencesByNumericValue: Map<number, number>;
    duplicateRows: DuplicateRow[];
    duplicateColumnSequences: RepeatedColumnSequence[];
  },
): string => {
  const {
    sheet,
    duplicateRows,
    duplicateColumnSequences,
    categorizedColumns,
    numOccurrencesByNumericValue,
  } = promptInput;

  return (
    createIntroduction() +
    createBasicInfoSection(excelFileData, sheet) +
    createAbstractSection(excelFileData) +
    createDataDescriptionSection(excelFileData) +
    createInstructionsSection(categorizedColumns) +
    createDataSection(sheet) +
    createDuplicateRowsSection(
      sheet,
      duplicateRows,
      numOccurrencesByNumericValue,
    ) +
    createDuplicateColumnSequencesSection(
      sheet,
      duplicateColumnSequences,
      numOccurrencesByNumericValue,
    ) +
    createTaskSection()
  );
};

function createIntroduction(): string {
  return `The raw data belonging to a scientific paper has been flagged by an automated system for containing duplicated data. Your job is to evaluate whether the flagged duplication is a false positive (i.e. it makes sense in the context of the paper) or if it's likely the result of a data-handling mistake or even deliberate fraud. You'll receive the abstract of the paper, a description of the data and the parts of the data that was flagged.
`;
}

function createBasicInfoSection(
  excelFileData: ExcelFileData,
  sheet: Sheet,
): string {
  return `# Basic info

- Title: '${excelFileData.articleName}'
- Excel filename: '${excelFileData.excelFileName}'
- Sheet name: '${sheet.name}'
- Number of rows in sheet: ${sheet.numRows >= maxNumRowsToAnalyze ? sheet.numRows + "+" : sheet.numRows}
`;
}

function createAbstractSection(excelFileData: ExcelFileData): string {
  if (!excelFileData.abstract) {
    return "";
  }
  return `
# Abstract

${excelFileData.abstract}
`;
}

function createDataDescriptionSection(excelFileData: ExcelFileData): string {
  const truncatedDataDescription =
    excelFileData.dataDescription.length > maxPromptDataDescriptionChars
      ? `${excelFileData.dataDescription.slice(0, maxPromptDataDescriptionChars)}... (content truncated due to exceeding character limit)`
      : excelFileData.dataDescription;
  return `
# Description of the data

${wrapInCodeBlock(truncatedDataDescription)}
`;
}

function createInstructionsSection(
  categorizedColumns: CategorizedColumn[],
): string {
  const lnColumns = categorizedColumns
    .filter((column) => column.isLnArgument)
    .map(({ name }) => name);
  const sqrtColumns = categorizedColumns
    .filter((column) => column.isSquareRoot)
    .map(({ name }) => name);
  const fractionColumns = categorizedColumns
    .filter((column) => column.isRepeatingFraction)
    .map(({ name }) => name);

  let instructions = `
# Instructions
Keep the following in mind when analyzing the duplications
- If a duplicate sequence/row has many values that are common in the spreadsheet (high number of occurrences): this can make it less suspicious that the sheet has multiple duplicate values in a row as long as the high number of occurrences actually makes sense in the context of the paper.
- It's good to consider what a row represents, for example whether it's one observation of a single individual or aggregated data of multiple observations.

### Common sources of false positives
- If the duplicate values are actually supposed to be shared between rows, such as species level data shared between all individuals belonging to that species.
- If the duplicate values are the result of some transformation (for example a fraction, square root, z-transformation or some statistical measure) where the original raw measurement was a number with low number of significant digits, but after the transformation gains a large amount of digits and looks more unique than it really is.
- If the duplicate values are part of a column with very tight distribution (for example, a measurement of body temperature where most measured values are around 37 degrees C)
- If a row contains multiple columns that are just transformations of the same data (for example, it's not suspicious if rows that share a 'diameter' also share a 'radius')

None of these are a definite sign of a false positive, but might provide an innocent reason for why the duplicates exist.
`;

  if (
    lnColumns.length > 0 ||
    sqrtColumns.length > 0 ||
    fractionColumns.length > 0
  ) {
    instructions += `
Note that some columns have artificially many significant digits because they are the result of either 1) a fraction 2) a log transformation or 3) a square root of the original measurement.   
`;
  }

  if (fractionColumns.length > 0) {
    instructions += `
The following columns contain fractions:
${fractionColumns.map((columnName) => "- " + columnName).join("\n")}
`;
  }

  if (sqrtColumns.length > 0) {
    instructions += `
The following columns contains square roots:
${sqrtColumns.map((columnName) => "- " + columnName).join("\n")}
`;
  }

  if (lnColumns.length > 0) {
    instructions += `
The following columns are log-transformed:
${lnColumns.map((columnName) => "- " + columnName).join("\n")}
`;
  }

  return instructions;
}

function createDataSection(sheet: Sheet): string {
  const numberOfSampleRows = 8;
  const columnNames = sheet.columnNames;
  const firstTenRows = sheet.getSampleData(numberOfSampleRows);
  const sampleTable = markdownTable([columnNames, ...firstTenRows]);

  return `
# Data
Here are the first ${numberOfSampleRows} rows of the spreadsheet to help you understand the structure of the spreadsheet:

${sampleTable}
`;
}

function createDuplicateRowsSection(
  sheet: Sheet,
  duplicateRows: DuplicateRow[],
  numOccurrencesByNumericValue: Map<number, number>,
): string {
  if (duplicateRows.length === 0) {
    return "";
  }

  const seenRowIndices = new Set<number>();
  const uniqueDuplicateRows = duplicateRows.filter((duplicateRow) => {
    const [rowIndex1, rowIndex2] = duplicateRow.rowIndices;
    const hasSeenRow =
      seenRowIndices.has(rowIndex1) || seenRowIndices.has(rowIndex2);
    if (!hasSeenRow) {
      seenRowIndices.add(rowIndex1);
      seenRowIndices.add(rowIndex2);
      return true;
    }
    return false;
  });
  const numDuplicateRowSamples = 6;
  const duplicateRowSamples = uniqueDuplicateRows.slice(
    0,
    numDuplicateRowSamples,
  );
  const remainingDuplicateRows = uniqueDuplicateRows.slice(
    numDuplicateRowSamples,
  );

  const columnNames = sheet.columnNames;
  let section = `

### Row pairs with duplicate cell values

`;
  for (const duplicateRow of duplicateRowSamples) {
    const [rowIndex1, rowIndex2] = duplicateRow.rowIndices;
    const duplicateRowTable = markdownTable([
      ["originalRowNumber", ...columnNames],
      [String(rowIndex1 + 1), ...sheet.getSampleRow(rowIndex1)],
      [String(rowIndex2 + 1), ...sheet.getSampleRow(rowIndex2)],
    ]);
    section += `
Rows ${rowIndex1 + 1} and ${rowIndex2 + 1}:

${duplicateRowTable}

They share the values in the following columns:
${duplicateRow.sharedColumns
  .map((columnIndex, i) => {
    const value = duplicateRow.sharedValues[i];
    const numOccurrences = numOccurrencesByNumericValue.get(value);
    if (!numOccurrences) {
      throw new Error(
        `Unexpectedly found no occurrences for the value '${value}' in sheet ${sheet.name}`,
      );
    }
    const column = duplicateRow.categorizedColumns[columnIndex];
    return `- '${column.name}' - value: ${value}, occurrences of value: ${numOccurrences}`;
  })
  .join("\n")}
`;
  }

  if (remainingDuplicateRows.length > 0) {
    section += `
Not shown are an additional ${remainingDuplicateRows.length} duplicate rows flagged as having a high or medium level or suspiciosness.
`;
  }

  return section;
}

function createDuplicateColumnSequencesSection(
  sheet: Sheet,
  duplicateColumnSequences: RepeatedColumnSequence[],
  numOccurrencesByNumericValue: Map<number, number>,
): string {
  if (duplicateColumnSequences.length === 0) {
    return "";
  }

  const seenStartRowIndices = new Set<number>();
  const uniqueDuplicateColumnSequences = duplicateColumnSequences.filter(
    (sequence) => {
      const [seq1, seq2] = sequence.sequences;
      const hasSeenStartRow =
        seenStartRowIndices.has(seq1.startRowIndex) ||
        seenStartRowIndices.has(seq2.startRowIndex);
      if (!hasSeenStartRow) {
        seenStartRowIndices.add(seq1.startRowIndex);
        seenStartRowIndices.add(seq2.startRowIndex);
        return true;
      }
      return false;
    },
  );
  const numDuplicateColumnSequenceSamples = 2;
  const duplicateColumnSequenceSamples = uniqueDuplicateColumnSequences.slice(
    0,
    numDuplicateColumnSequenceSamples,
  );
  const remainingDuplicateColumnSequences =
    uniqueDuplicateColumnSequences.slice(numDuplicateColumnSequenceSamples);

  const columnNames = sheet.columnNames;
  let section = `
### Duplicated vertical sequences of cells

Here are examples of pairs of vertical sequences of cells that are perfect duplicates.
`;
  const maxDuplicateSequenceRows = 10;
  for (const duplicateColumnSequence of duplicateColumnSequenceSamples) {
    const { sequences, values } = duplicateColumnSequence;
    const sequence1StartRowNumber = sequences[0].startRowIndex + 1;
    const sequence1EndRowNumber = sequences[0].startRowIndex + values.length;
    const sequence1ColumnName = sequences[0].column.name;
    const sequence2StartRowNumber = sequences[1].startRowIndex + 1;
    const sequence2EndRowNumber = sequences[1].startRowIndex + values.length;
    const sequence2ColumnName = sequences[1].column.name;

    const numDuplicateSequenceRowsInTable = Math.min(
      maxDuplicateSequenceRows,
      values.length,
    );

    const sequence1Rows = sheet
      .getSampleData(
        numDuplicateSequenceRowsInTable,
        sequences[0].startRowIndex,
      )
      .map((row, i) => {
        const originalRowNumber = sequence1StartRowNumber + i;
        return [String(originalRowNumber), ...row];
      });
    const sequence1MarkdownTable = markdownTable([
      ["originalRowNumber", ...columnNames],
      ...sequence1Rows,
    ]);

    const sequence2Rows = sheet
      .getSampleData(
        numDuplicateSequenceRowsInTable,
        sequences[1].startRowIndex,
      )
      .map((row, i) => {
        const originalRowNumber = sequence2StartRowNumber + i;
        return [String(originalRowNumber), ...row];
      });
    const sequence2MarkdownTable = markdownTable([
      ["originalRowNumber", ...columnNames],
      ...sequence2Rows,
    ]);
    section += `
The sequence of ${duplicateColumnSequence.values.length} values from row ${sequence1StartRowNumber} to ${sequence1EndRowNumber} of the column '${sequence1ColumnName}' is a perfect duplicate of the sequence from row ${sequence2StartRowNumber} to ${sequence2EndRowNumber} of the column '${sequence2ColumnName}'.

Rows ${sequence1StartRowNumber} to ${sequence1StartRowNumber + numDuplicateSequenceRowsInTable - 1}:

${sequence1MarkdownTable}

Rows ${sequence2StartRowNumber} to ${sequence2StartRowNumber + numDuplicateSequenceRowsInTable - 1}:

${sequence2MarkdownTable}

They share the values following values:
${duplicateColumnSequence.values
  .map((value) => {
    const numOccurrences = numOccurrencesByNumericValue.get(value);
    if (!numOccurrences) {
      throw new Error(
        `Unexpectedly found no occurrences for the value '${value}' in sheet ${sheet.name}`,
      );
    }
    return `- Value: ${value}, occurrences of value: ${numOccurrences}`;
  })
  .join("\n")}
`;
    if (values.length > numDuplicateSequenceRowsInTable) {
      section += `
The table was truncated to ${numDuplicateSequenceRowsInTable} for brevity.
`;
    }
  }
  if (remainingDuplicateColumnSequences.length > 0) {
    section += `
Not shown are an additional ${remainingDuplicateColumnSequences.length} duplicated sequences flagged as having a high or medium level of suspiciousness.
`;
  }
  return section;
}

function createTaskSection(): string {
  return `
# Your task

Do you think these duplicated blocks of cells make sense in the context of the paper or do you think they could be a sign of a data-handling mistake or even deliberate fraud? Please include the following in your response:
- Your best explanation for the duplicates (could be different for each example).
- Your best theory for how the patterns could have an innocent explanation and therefore be a false positive.
- A suspiciousness score from 1 to 10 that expresses the probability that the data contains real issues, where 1 means it's a certain false positive and 10 means it's 100% a real issue.
- If you believe the data has issues, provide an impact score from 1 to 10 which expresses how seriously the issue might impact the paper's conclusions, where 1 means no impact and 10 means that the conclusions are entirely untrustworthy.
`;
}
