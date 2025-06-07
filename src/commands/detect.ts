import { Command } from "@commander-js/extra-typings";
import { type RepeatedSequence } from "src/types";
import { deduplicateSortedSequences, findRepeatedSequences, findDuplicateValues } from "src/detection";
import { parseMatrix, invertMatrix, getNumberCount } from "src/utils/excel";
import { formatSequencesForDisplay, formatDuplicatesByEntropyForDisplay, formatDuplicatesByOccurrenceForDisplay } from "src/utils/output";
import xlsx from "xlsx";
const program = new Command();

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

    const humanReadableSequences = formatSequencesForDisplay(
      deduplicatedSortedSequences.slice(0, 20)
    );

    const humanReadableTopEntropyDuplicateNumbers = formatDuplicatesByEntropyForDisplay(topEntropyDuplicateNumbers);

    const humanReadableTopOccurenceNumbers = formatDuplicatesByOccurrenceForDisplay(topOccurenceHighEntropyDuplicateNumbers);
    console.log(`Top entropy duplicate numbers:`);
    console.table(humanReadableTopEntropyDuplicateNumbers);
    console.log(`Top occurance high entropy duplicate numbers:`);
    console.table(humanReadableTopOccurenceNumbers);
    console.log(`Repeated sequences:`);
    console.table(humanReadableSequences);
    console.timeEnd("Time elapsed");
  });









program.parse();
