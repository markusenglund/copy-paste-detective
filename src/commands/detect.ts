import { Command } from "@commander-js/extra-typings";
import xlsx from "xlsx";
const program = new Command();

program.name("detect").description("First command").version("0.1.0");

program
  .command("excel")
  .description("Investigate an excel file")
  .action(async () => {
    const workbook = xlsx.readFile("files/pnas.2300363120.sd01.xlsx");
    const sheetNames = workbook.SheetNames;
    console.log("sheetNames", sheetNames);
    const sheet = workbook.Sheets[sheetNames[1]];
    const data: unknown[][] = xlsx.utils.sheet_to_json(sheet, {
      raw: true,
      header: 1
    });
    console.log("Excel file loaded:", data.length, "rows");

    const invertedData = invertMatrix(data);

    const numOccurencesByNumericCellValue = new Map<number, number>();
    for (const column of invertedData) {
      for (const cell of column) {
        if (typeof cell === "number") {
          const numOccurences = numOccurencesByNumericCellValue.get(cell) ?? 0;
          numOccurencesByNumericCellValue.set(cell, numOccurences + 1);
        }
      }
    }
    console.log(
      "Number of numeric values: ",
      numOccurencesByNumericCellValue.size
    );
    const duplicateValuesSortedByEntropy = [
      ...numOccurencesByNumericCellValue.entries()
    ]
      .filter(([value, numOccurences]) => numOccurences > 1)
      .map(([value, numOccurences]) => {
        const entropy = calculateNumberEntropy(value);
        return { value, numOccurences, entropy };
      })
      .toSorted((a, b) => b.entropy - a.entropy);

    console.log(
      "Number of duplicate numeric values: ",
      duplicateValuesSortedByEntropy.length
    );

    console.log(
      "Entries sorted by entropy",
      duplicateValuesSortedByEntropy.slice(0, 10)
    );
    // const mostCommon = sorted[0];
    // console.log("mostCommon", mostCommon);
    const repeatedSequences = findRepeatedSequences(invertedData);
    const sortedSequences = repeatedSequences
      .toSorted((a, b) => b.sumLogEntropy - a.sumLogEntropy)
      .slice(0, 10);
    console.log(sortedSequences);
  });

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

function calculateSequenceLogEntropySum(values: number[]) {
  const sum = values.reduce((acc, value) => {
    const logEntropy = Math.log10(calculateNumberEntropy(value));
    return acc + logEntropy;
  }, 0);
  return sum;
}

type Position = {
  column: number;
  startRow: number;
};
type RepeatedSequence = {
  positions: [Position, Position];
  values: number[];
  sumLogEntropy: number;
};
function findRepeatedSequences(matrix: unknown[][]): RepeatedSequence[] {
  const repeatedSequences: RepeatedSequence[] = [];
  let currentSequence: RepeatedSequence | null = null;
  const positionsByValue = new Map<number, Position[]>();
  for (let columnIndex = 0; columnIndex < matrix.length; columnIndex++) {
    for (let rowIndex = 0; rowIndex < matrix[columnIndex].length; rowIndex++) {
      const cellValue = matrix[columnIndex][rowIndex];
      if (typeof cellValue === "number") {
        const positions = positionsByValue.get(cellValue) ?? [];
        const newPosition: Position = {
          column: columnIndex,
          startRow: rowIndex
        };
        for (const position of positions) {
          let length = 1;
          const repeatedValues: number[] = [cellValue];
          while (
            typeof matrix[position.column][position.startRow + length] ===
              "number" &&
            matrix[position.column][position.startRow + length] ===
              matrix[columnIndex][rowIndex + length]
          ) {
            length++;
            repeatedValues.push(
              matrix[position.column][position.startRow + length] as number
            );
          }
          repeatedSequences.push({
            positions: [position, newPosition],
            values: repeatedValues,
            sumLogEntropy: calculateSequenceLogEntropySum(repeatedValues)
          });
        }
        positions.push(newPosition);
        positionsByValue.set(cellValue, positions);
      }
    }
  }
  return repeatedSequences;
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

program.parse();
