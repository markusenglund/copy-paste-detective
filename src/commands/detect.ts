import { Command } from "@commander-js/extra-typings";
import xlsx from "xlsx";
const program = new Command();

program.name("detect").description("First command").version("0.1.0");

program
  .command("excel")
  .description("Investigate an excel file")
  .action(async () => {
    console.time("Time elapsed");
    console.time("xlsx.readFile");
    // const workbook = xlsx.readFile("files/fraud/pnas.2300363120.sd01.xlsx");
    // const workbook = xlsx.readFile(
    //   "files/fraud/Dumicola+familiarity+wide.xlsx"
    // );
    const workbook = xlsx.readFile(
      "files/non-fraud/doi_10_5061_dryad_2z34tmpxj__v20250416/JGI_maxquant.xlsx",
      { sheetRows: 5000 } // Only read the first 5000 rows from each sheet
    );
    // console.timeEnd("xlsx.readFile");

    const sheetNames = workbook.SheetNames;
    console.log("sheetNames", sheetNames);
    const repeatedSequences: (RepeatedSequence & { sheetName: string })[] = [];
    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      console.time(`xlsx.utils.sheet_to_json ${sheetName}`);
      const data: unknown[][] = xlsx.utils.sheet_to_json(sheet, {
        raw: false,
        header: 1
      });
      console.timeEnd(`xlsx.utils.sheet_to_json ${sheetName}`);
      console.time(`parseMatrix ${sheetName}`);
      const numberCounter = { count: 0 };
      const matrix = parseMatrix(data, numberCounter);
      console.log(`[${sheetName}] Found ${numberCounter.count} numeric values`);
      console.timeEnd(`parseMatrix ${sheetName}`);

      console.time(`findDuplicateValues ${sheetName}`);
      const {
        duplicateValuesSortedByEntropy,
        duplicatedValuesAboveThresholdSortedByOccurences
      } = findDuplicateValues(matrix);
      console.timeEnd(`findDuplicateValues ${sheetName}`);
      for (const {
        value,
        numOccurences,
        entropy
      } of duplicateValuesSortedByEntropy.slice(0, 3)) {
        console.log(
          `[${sheetName}] Top 3 entropy duplicate numeric value: ${value} (${numOccurences} occurences, entropy: ${entropy})`
        );
      }
      for (const {
        value,
        numOccurences,
        entropy
      } of duplicatedValuesAboveThresholdSortedByOccurences.slice(0, 3)) {
        console.log(
          `[${sheetName}] Top 3 highest occurence duplicate numeric value above 5000 entropy: ${value} (${numOccurences} occurences, entropy: ${entropy})`
        );
      }
      console.time(`invertMatrix ${sheetName}`);
      const invertedMatrix = invertMatrix(matrix);
      console.timeEnd(`invertMatrix ${sheetName}`);

      console.time(`findRepeatedSequences ${sheetName}`);
      const verticalSequences = findRepeatedSequences(invertedMatrix, {
        sheetName,
        isInverted: true,
        numberCount: numberCounter.count
      });
      const horizontalSequences = findRepeatedSequences(matrix, {
        sheetName,
        isInverted: false,
        numberCount: numberCounter.count
      });
      console.timeEnd(`findRepeatedSequences ${sheetName}`);
      repeatedSequences.push(...verticalSequences);
      repeatedSequences.push(...horizontalSequences);
    }
    console.time("sort repeatedSequences");
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
    console.timeEnd("sort repeatedSequences");

    const humanReadableSequences = deduplicatedSortedSequences
      .slice(0, 20)
      .map(sequence => {
        const firstCellID = sequence.positions[0].cellId;
        const secondCellId = sequence.positions[1].cellId;
        // return `[${sequence.sheetName}] Length = ${sequence.values.length}, Adj entropy = ${sequence.adjustedSequenceEntropyScore.toFixed(1)}, Entropy = ${sequence.sequenceEntropyScore.toFixed(1)}, Cells: '${firstCellID}' & '${secondCellId}' - values: ${sequence.values[0]} -> ${sequence.values.at(-1)}, Num positions: ${sequence.positions.length} Axis: ${sequence.axis}`;
        const table = {
          sheetName: sequence.sheetName,
          length: sequence.values.length,
          matrix: sequence.numberCount,
          adjustedEntropy: sequence.adjustedSequenceEntropyScore.toFixed(1),
          matrixSizeAdjEntropy:
            sequence.matrixSizeAdjustedEntropyScore.toFixed(1),
          entropy: sequence.sequenceEntropyScore.toFixed(1),
          cell1: firstCellID,
          cell2: secondCellId,
          values: `${sequence.values[0]} -> ${sequence.values.at(-1)}`,
          numPositions: sequence.positions.length,
          axis: sequence.axis
        };
        return table;
      });
    console.log(`Repeated sequences:`);
    console.table(humanReadableSequences);
    console.timeEnd("Time elapsed");
  });

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
  if (value >= 1900 && value <= 2100 && value % 1 === 0) {
    return 100;
  }

  // Convert numbers with decimal points to integers by simply removing the decimal point but keeping the digits
  const str = value.toString();
  const withoutPoint = str.replace(".", "");
  // Remove trailing zeroes
  const withoutTrailingZeroes = withoutPoint.replace(/0+$/, "");

  // If a number has lots of repeating digits, only the first two in the repeating sequence is kept
  const withoutRepeatingDigits = withoutTrailingZeroes.replace(
    /(\d)\1+/g,
    (_, digit) => digit + digit
  );
  const entropy = parseInt(withoutRepeatingDigits);
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

type Position = {
  column: number;
  startRow: number;
  cellId: string;
};
type RepeatedSequence = {
  positions: [Position, Position];
  values: number[];
  sequenceEntropyScore: number;
  adjustedSequenceEntropyScore: number;
  matrixSizeAdjustedEntropyScore: number;
  numberCount: number;
  sheetName: string;
  axis: "horizontal" | "vertical";
};
function findRepeatedSequences(
  matrix: unknown[][],
  {
    isInverted,
    sheetName,
    numberCount
  }: { isInverted: boolean; sheetName: string; numberCount: number }
): RepeatedSequence[] {
  const numberCountEntropyScore = calculateEntropyScore(numberCount);

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
            // If the values are on the same row, skip since this is often expected to be the case in legitimate data
            if (position.startRow === rowIndex) {
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
            repeatedSequences.push(repeatedSequence);
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

function findDuplicateValues(matrix: unknown[][]): {
  duplicateValuesSortedByEntropy: {
    value: number;
    numOccurences: number;
    entropy: number;
  }[];
  duplicatedValuesAboveThresholdSortedByOccurences: {
    value: number;
    numOccurences: number;
    entropy: number;
  }[];
} {
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

function parseMatrix(
  matrix: unknown[][],
  numberCounter: { count: number }
): unknown[][] {
  const parsedMatrix = matrix.map(row =>
    row.map(cell => {
      if (typeof cell === "string" && cell !== "") {
        const cellNumber = Number(cell);
        if (!Number.isNaN(cellNumber)) {
          numberCounter.count++;
          return cellNumber;
        }
      }
      return cell;
    })
  );
  return parsedMatrix;
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
