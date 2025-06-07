import { Command } from "@commander-js/extra-typings";
import { SuspicionLevel, type Position, type RepeatedSequence, type DuplicateValue, type DuplicateValuesResult } from "src/types";
import { deduplicateSortedSequences, findRepeatedSequences, findDuplicateValues } from "src/detection";
import { parseMatrix, invertMatrix, getNumberCount } from "src/utils/excel";
import xlsx from "xlsx";
const program = new Command();
const levelToSymbol: Record<SuspicionLevel, string> = {
  [SuspicionLevel.None]: "",
  [SuspicionLevel.Low]: "❔",
  [SuspicionLevel.Medium]: "✅",
  [SuspicionLevel.High]: "🔴"
};

program.name("detect").description("First command").version("0.1.0");

program
  .command("excel")
  .description("Investigate an excel file")
  .action(async () => {
    console.time("Time elapsed");
    console.time("Read Excel file in");
    // const workbook = xlsx.readFile("files/fraud/pnas.2300363120.sd01.xlsx");
    // const workbook = xlsx.readFile(
    //   "files/fraud/Dumicola+familiarity+wide.xlsx"
    // );
    const workbook = xlsx.readFile(
      "files/non-fraud/doi_10_5061_dryad_stqjq2cdp__v20250418/2025-3-24-common_garden.xlsx",
      // "files/non-fraud/doi_10_5061_dryad_stqjq2cdp__v20250418/2025-3-24-Field_survey.xlsx",
      { sheetRows: 5000 } // Only read the first 5000 rows from each sheet
    );
    console.timeEnd("Read Excel file in");

    const sheetNames = workbook.SheetNames;
    console.log(`Found ${sheetNames.length} sheets: ${sheetNames.join(", ")}`);
    const repeatedSequences: (RepeatedSequence & { sheetName: string })[] = [];
    const topEntropyDuplicateNumbers: {
      value: number;
      numOccurences: number;
      entropy: number;
      sheetName: string;
      matrixSize: number;
    }[] = [];
    const topOccurenceHighEntropyDuplicateNumbers: {
      value: number;
      numOccurences: number;
      entropy: number;
      sheetName: string;
      matrixSize: number;
    }[] = [];
    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const matrix: unknown[][] = xlsx.utils.sheet_to_json(sheet, {
        raw: true,
        header: 1
      });

      const numberCount = getNumberCount(matrix);
      const parsedMatrix = parseMatrix(matrix);
      console.log(`[${sheetName}] Found ${numberCount} numeric values`);

      const {
        duplicateValuesSortedByEntropy,
        duplicatedValuesAboveThresholdSortedByOccurences
      } = findDuplicateValues(parsedMatrix);

      topEntropyDuplicateNumbers.push(
        ...duplicateValuesSortedByEntropy.slice(0, 5).map(obj => ({
          ...obj,
          sheetName,
          matrixSize: numberCount
        }))
      );

      topOccurenceHighEntropyDuplicateNumbers.push({
        ...duplicatedValuesAboveThresholdSortedByOccurences[0],
        sheetName,
        matrixSize: numberCount
      });
      const invertedMatrix = invertMatrix(parsedMatrix);

      const verticalSequences = findRepeatedSequences(invertedMatrix, {
        sheetName,
        isInverted: true,
        numberCount
      });
      const horizontalSequences = findRepeatedSequences(parsedMatrix, {
        sheetName,
        isInverted: false,
        numberCount
      });

      repeatedSequences.push(...verticalSequences);
      repeatedSequences.push(...horizontalSequences);
    }
    const sortedSequences = repeatedSequences
      .toSorted((a, b) => {
        return (
          (b.matrixSizeAdjustedEntropyScore || 0) -
          (a.matrixSizeAdjustedEntropyScore || 0)
        ); // Use || 0 to handle NaN values. TODO: Fix this in the findRepeatedSequences function
      })
      .filter(sequence => sequence.matrixSizeAdjustedEntropyScore > 1);

    const deduplicatedSortedSequences =
      deduplicateSortedSequences(sortedSequences);

    const humanReadableSequences = deduplicatedSortedSequences
      .slice(0, 20)
      .map(sequence => {
        const firstCellID = sequence.positions[0].cellId;
        const secondCellId = sequence.positions[1].cellId;
        let level = SuspicionLevel.None;
        if (sequence.matrixSizeAdjustedEntropyScore > 10) {
          level = SuspicionLevel.High;
        } else if (sequence.matrixSizeAdjustedEntropyScore > 5) {
          level = SuspicionLevel.Medium;
        } else if (sequence.matrixSizeAdjustedEntropyScore > 4) {
          level = SuspicionLevel.Low;
        }
        const table = {
          level: levelToSymbol[level],
          sheetName: sequence.sheetName,
          values:
            sequence.values.length > 1
              ? `${sequence.values[0]} -> ${sequence.values.at(-1)}`
              : `${sequence.values[0]}`,
          length: sequence.values.length,
          sizeAdjEntropy: sequence.matrixSizeAdjustedEntropyScore.toFixed(1),
          adjEntropy: sequence.adjustedSequenceEntropyScore.toFixed(1),
          entropy: sequence.sequenceEntropyScore.toFixed(1),
          cell1: firstCellID,
          cell2: secondCellId,
          matrix: sequence.numberCount,
          instances: sequence.positions.length,
          axis: sequence.axis
        };
        return table;
      });

    const humanReadableTopEntropyDuplicateNumbers = topEntropyDuplicateNumbers
      .toSorted((a, b) => (b.entropy ?? 0) - (a.entropy ?? 0))
      .map(obj => {
        let level = SuspicionLevel.None;
        if (obj.entropy > 10_000_000) {
          level = SuspicionLevel.High;
        } else if (obj.entropy > 100_000) {
          level = SuspicionLevel.Medium;
        } else if (obj.entropy > 10_000) {
          level = SuspicionLevel.Low;
        }
        return {
          level: levelToSymbol[level],
          sheetName: obj.sheetName,
          value: obj.value,
          n: obj.numOccurences,
          entropy: obj.entropy,
          matrix: obj.matrixSize
        };
      });

    const humanReadableTopOccurenceNumbers =
      topOccurenceHighEntropyDuplicateNumbers
        .toSorted((a, b) => (b.numOccurences ?? 0) - (a.numOccurences ?? 0))
        .map(obj => {
          let level = SuspicionLevel.None;
          if (obj.numOccurences > 100) {
            level = SuspicionLevel.High;
          } else if (obj.numOccurences > 20) {
            level = SuspicionLevel.Medium;
          } else if (obj.numOccurences > 5) {
            level = SuspicionLevel.Low;
          }
          return {
            level: levelToSymbol[level],
            sheetName: obj.sheetName,
            value: obj.value,
            n: obj.numOccurences,
            entropy: obj.entropy,
            matrix: obj.matrixSize
          };
        });
    console.log(`Top entropy duplicate numbers:`);
    console.table(humanReadableTopEntropyDuplicateNumbers);
    console.log(`Top occurance high entropy duplicate numbers:`);
    console.table(humanReadableTopOccurenceNumbers);
    console.log(`Repeated sequences:`);
    console.table(humanReadableSequences);
    console.timeEnd("Time elapsed");
  });









program.parse();
