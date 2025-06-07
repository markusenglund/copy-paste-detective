import { Command } from "@commander-js/extra-typings";
import { roundFloatingPointInaccuracies } from "src/roundFloatingPointInaccuracies";
import { SuspicionLevel, type Position, type RepeatedSequence, type DuplicateValue, type DuplicateValuesResult } from "src/types";
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

function parseMatrix(matrix: unknown[][]): unknown[][] {
  const parsedMatrix = matrix.map(row =>
    row.map(cell => {
      if (typeof cell === "number") {
        return roundFloatingPointInaccuracies(cell);
      }
      return cell;
    })
  );
  return parsedMatrix;
}

function deduplicateSortedSequences(
  repeatedSequences: RepeatedSequence[]
): RepeatedSequence[] {
  let previousSequence: RepeatedSequence | null = null;
  const deduplicatedSortedSequences: RepeatedSequence[] = [];
  for (const sequence of repeatedSequences) {
    if (previousSequence) {
      const isSameSequence =
        previousSequence.adjustedSequenceEntropyScore ===
          sequence.adjustedSequenceEntropyScore &&
        previousSequence.values.every((value, index) => {
          return value === sequence.values[index];
        });
      if (isSameSequence) {
        sequence.positions.forEach(position => {
          // Check if position already exists in previousSequence and if not, add it
          const exists = previousSequence?.positions.find(
            p => p.cellId === position.cellId
          );
          if (!exists) {
            previousSequence?.positions.push(position);
          }
        });
        continue;
      }
    }
    deduplicatedSortedSequences.push(sequence);
    previousSequence = sequence;
  }
  return deduplicatedSortedSequences;
}

function calculateNumberEntropy(value: number) {
  // Values that are common years should receive an entropy score of 100
  if (value >= 1900 && value <= 2030 && Number.isInteger(value)) {
    return 100;
  }

  // Convert numbers with decimal points to integers by simply removing the decimal point but keeping the digits
  const str = value.toString();
  const withoutPoint = str.replace(".", "");
  // Remove trailing zeroes
  const withoutTrailingZeroes = withoutPoint.replace(/0+$/, "");
  const withoutOneTrailingFive = withoutTrailingZeroes.replace(/5$/, "");

  // If a number has 4 or more repeating digits, only the first in the repeating sequence is kept
  const withoutRepeatingDigits = withoutOneTrailingFive.replace(
    /(\d)\1{3,}/g,
    (_, digit) => digit
  );
  const entropy = parseInt(withoutRepeatingDigits || "0");
  return entropy;
}

function calculateEntropyScore(rawEntropy: number) {
  // Prevent extremely large numbers as well numbers below 100 from having an outsized effect on the entropy score

  if (rawEntropy < 100) {
    return Math.log10(rawEntropy);
  }
  if (rawEntropy < 100_000) {
    return 10 * Math.log10(rawEntropy) - 20;
  }
  return Math.log10(rawEntropy) + 25;
}

function calculateSequenceEntropyScore(values: number[]) {
  const sum = values.reduce((acc, value) => {
    const rawNumberEntropy = calculateNumberEntropy(value);
    const individualEntropyScore = calculateEntropyScore(rawNumberEntropy);
    // Math.pow(Math.min(rawNumberEntropy, entropyCeiling), 1 / 4) / 10;
    return acc + individualEntropyScore;
  }, 0);
  return sum;
}

function findRepeatedSequences(
  matrix: unknown[][],
  {
    isInverted,
    sheetName,
    numberCount
  }: { isInverted: boolean; sheetName: string; numberCount: number }
): RepeatedSequence[] {
  const numberCountEntropyScore = calculateEntropyScore(
    Math.max(numberCount, 500) // Prevent very small excel files from getting too high of an entropy score
  );

  const repeatedSequences: RepeatedSequence[] = [];
  const positionsByValue = new Map<number, Position[]>();
  const checkedPositionPairs = new Set<string>();
  for (let columnIndex = 0; columnIndex < matrix.length; columnIndex++) {
    for (let rowIndex = 0; rowIndex < matrix[columnIndex].length; rowIndex++) {
      const cellValue = matrix[columnIndex][rowIndex];
      if (typeof cellValue === "number") {
        const positions = positionsByValue.get(cellValue) ?? [];
        const newPosition: Position = {
          column: columnIndex,
          startRow: rowIndex,
          cellId: isInverted
            ? getCellId(columnIndex, rowIndex)
            : getCellId(rowIndex, columnIndex)
        };
        if (positions.length < 100) {
          for (const position of positions) {
            if (
              checkedPositionPairs.has(
                `${position.column}-${position.startRow}-${columnIndex}-${rowIndex}`
              )
            ) {
              continue;
            }
            // If the values are on the same row, skip since this is often expected to be the case in legitimate data (only in inverted mode, since the same is not true for columns)
            if (position.startRow === rowIndex && isInverted) {
              continue;
            }
            let length = 1;
            const repeatedValues: number[] = [cellValue];
            while (
              typeof matrix[position.column][position.startRow + length] ===
                "number" &&
              !(
                position.column === columnIndex &&
                rowIndex === position.startRow + length
              ) &&
              matrix[position.column][position.startRow + length] ===
                matrix[columnIndex][rowIndex + length]
            ) {
              repeatedValues.push(
                matrix[position.column][position.startRow + length] as number
              );
              checkedPositionPairs.add(
                `${position.column}-${position.startRow + length}-${columnIndex}-${rowIndex + length}`
              );
              length++;
            }
            const minSequenceEntropyScore = 10;
            const sequenceEntropyScore =
              calculateSequenceEntropyScore(repeatedValues);
            if (sequenceEntropyScore <= minSequenceEntropyScore) {
              continue;
            }
            if (
              position.column === newPosition.column &&
              position.startRow + length === newPosition.startRow
            ) {
              // Skip if the repeated sequences are back-to-back
              continue;
            }
            const { mostCommonIntervalSize, mostCommonIntervalSizePercentage } =
              calculateSequenceRegularity(repeatedValues);
            const intervalAdjustedSequenceEntropyScore =
              sequenceEntropyScore * (1 - mostCommonIntervalSizePercentage);
            const matrixSizeAdjustedEntropyScore =
              intervalAdjustedSequenceEntropyScore / numberCountEntropyScore;
            const repeatedSequence: RepeatedSequence = {
              positions: [position, newPosition],
              values: repeatedValues,
              sequenceEntropyScore,
              adjustedSequenceEntropyScore:
                intervalAdjustedSequenceEntropyScore,
              matrixSizeAdjustedEntropyScore,
              numberCount,
              sheetName,
              axis: isInverted ? "vertical" : "horizontal"
            };
            if (repeatedSequence.matrixSizeAdjustedEntropyScore > 1) {
              repeatedSequences.push(repeatedSequence);
            }
          }
        }
        positions.push(newPosition);
        positionsByValue.set(cellValue, positions);
      }
    }
  }

  return repeatedSequences;
}

function calculateSequenceRegularity(sequence: number[]) {
  if (sequence.length < 2) {
    return { mostCommonIntervalSize: 0, mostCommonIntervalSizePercentage: 0 };
  }
  if (sequence.every(value => value === sequence[0])) {
    return {
      mostCommonIntervalSize: sequence.length - 1,
      mostCommonIntervalSizePercentage: (sequence.length - 1) / sequence.length
    };
  }

  const intervalSizeByNumOccurences = new Map<number, number>();
  for (let i = 0; i < sequence.length - 1; i++) {
    const intervalSize = sequence[i + 1] - sequence[i];
    const numOccurences = intervalSizeByNumOccurences.get(intervalSize) ?? 0;
    intervalSizeByNumOccurences.set(intervalSize, numOccurences + 1);
  }
  const sortedIntervalSizes = [...intervalSizeByNumOccurences.entries()]
    .map(([intervalSize, numOccurences]) => ({
      intervalSize,
      numOccurences
    }))
    .sort((a, b) => b.numOccurences - a.numOccurences);

  const mostCommonIntervalSize = sortedIntervalSizes[0].intervalSize;
  const mostCommonIntervalSizePercentage =
    (sortedIntervalSizes[0].numOccurences - 1) / (sequence.length - 1); // Subtract by one so the percentage is 0% if all intervals are unique, also so the percentage is never 100%
  return { mostCommonIntervalSizePercentage, mostCommonIntervalSize };
}

function findDuplicateValues(matrix: unknown[][]): DuplicateValuesResult {
  const numOccurencesByNumericCellValue = new Map<number, number>();
  for (const row of matrix) {
    for (const cell of row) {
      if (typeof cell === "number") {
        const numOccurences = numOccurencesByNumericCellValue.get(cell) ?? 0;
        numOccurencesByNumericCellValue.set(cell, numOccurences + 1);
      }
    }
  }

  const duplicateValuesSortedByEntropy = [
    ...numOccurencesByNumericCellValue.entries()
  ]
    .filter(([value, numOccurences]) => numOccurences > 1)
    .map(([value, numOccurences]) => {
      const entropy = calculateNumberEntropy(value);
      return { value, numOccurences, entropy };
    })
    .toSorted((a, b) => b.entropy - a.entropy);

  const entropyThreshold = 5000;
  const duplicatedValuesAboveThresholdSortedByOccurences =
    duplicateValuesSortedByEntropy
      .filter(({ entropy }) => entropy > entropyThreshold)
      .toSorted((a, b) => b.numOccurences - a.numOccurences);

  return {
    duplicateValuesSortedByEntropy,
    duplicatedValuesAboveThresholdSortedByOccurences
  };
}

function invertMatrix(matrix: unknown[][]) {
  const invertedMatrix: unknown[][] = [];
  for (let i = 0; i < matrix[0].length; i++) {
    invertedMatrix[i] = [];
    for (let j = 0; j < matrix.length; j++) {
      invertedMatrix[i][j] = matrix[j][i];
    }
  }
  return invertedMatrix;
}

function getNumberCount(matrix: unknown[][]): number {
  let numberCount = 0;
  matrix.forEach(row =>
    row.forEach(cell => {
      if (typeof cell === "number") {
        numberCount++;
      }
    })
  );
  return numberCount;
}

function getCellId(columnIndex: number, rowIndex: number): string {
  let columnLetters = "";
  let dividend = columnIndex;
  do {
    const remainder = dividend % 26;
    columnLetters = String.fromCharCode(65 + remainder) + columnLetters;
    dividend = Math.floor(dividend / 26) - 1;
  } while (dividend >= 0);
  const rowNumber = rowIndex + 1;
  return `${columnLetters}${rowNumber}`;
}

program.parse();
