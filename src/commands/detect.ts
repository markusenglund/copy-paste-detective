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
    const repeatedSequences: (RepeatedSequence & { sheetName: string })[] = [];
    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data: unknown[][] = xlsx.utils.sheet_to_json(sheet, {
        raw: true,
        header: 1
      });
      console.log("data", data.slice(0, 10));

      const duplicateValuesSortedByEntropy = findDuplicateValues(data);
      console.log(
        `[${sheetName}] Highest entropy duplicate numeric value: ${duplicateValuesSortedByEntropy[0].value} (${duplicateValuesSortedByEntropy[0].numOccurences} occurences, entropy: ${duplicateValuesSortedByEntropy[0].entropy})`
      );

      const sortedSheetSequences = findRepeatedSequences(data);
      sortedSheetSequences.forEach(sequence => {
        repeatedSequences.push({
          ...sequence,
          sheetName
        });
      });
    }
    // const mostCommon = sorted[0];
    // console.log("mostCommon", mostCommon);
    const sortedSequences = repeatedSequences
      .toSorted((a, b) => b.sumLogEntropy - a.sumLogEntropy)
      .slice(0, 20);

    const humanReadableSequences = sortedSequences.map(sequence => {
      const firstCellID = sequence.positions[0].cellId;
      const secondCellId = sequence.positions[1].cellId;
      return `[${sequence.sheetName}] (${sequence.values.length}, entropy: ${sequence.sumLogEntropy.toFixed(1)}) [${firstCellID}, ${secondCellId}] - values: ${sequence.values[0]} -> ${sequence.values.at(-1)}`;
    });
    console.log(`Repeated sequences:`);
    console.log(humanReadableSequences.join("\n"));
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

function calculateSequenceEntropyScore(values: number[]) {
  const sum = values.reduce((acc, value) => {
    const rawNumberEntropy = calculateNumberEntropy(value);
    // Prevent extremely large numbers from having an outsized effect on the entropy score
    const entropyCeiling = 10e7;
    const individualEntropyScore =
      Math.pow(Math.min(rawNumberEntropy, entropyCeiling), 1 / 4) / 10;
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
  sumLogEntropy: number;
};
function findRepeatedSequences(matrix: unknown[][]): RepeatedSequence[] {
  const invertedMatrix = invertMatrix(matrix);

  const repeatedSequences: RepeatedSequence[] = [];
  let currentSequence: RepeatedSequence | null = null;
  const positionsByValue = new Map<number, Position[]>();
  const checkedPositionPairs = new Set<string>();
  for (
    let columnIndex = 0;
    columnIndex < invertedMatrix.length;
    columnIndex++
  ) {
    for (
      let rowIndex = 0;
      rowIndex < invertedMatrix[columnIndex].length;
      rowIndex++
    ) {
      const cellValue = invertedMatrix[columnIndex][rowIndex];
      if (typeof cellValue === "number") {
        const positions = positionsByValue.get(cellValue) ?? [];
        const newPosition: Position = {
          column: columnIndex,
          startRow: rowIndex,
          cellId: getCellId(columnIndex, rowIndex)
        };
        for (const position of positions) {
          if (
            checkedPositionPairs.has(
              `${position.column}-${position.startRow}-${columnIndex}-${rowIndex}`
            )
          ) {
            continue;
          }
          let length = 1;
          const repeatedValues: number[] = [cellValue];
          while (
            typeof invertedMatrix[position.column][
              position.startRow + length
            ] === "number" &&
            !(
              position.column === columnIndex &&
              rowIndex === position.startRow + length
            ) &&
            invertedMatrix[position.column][position.startRow + length] ===
              invertedMatrix[columnIndex][rowIndex + length]
          ) {
            repeatedValues.push(
              invertedMatrix[position.column][
                position.startRow + length
              ] as number
            );
            checkedPositionPairs.add(
              `${position.column}-${position.startRow + length}-${columnIndex}-${rowIndex + length}`
            );
            length++;
          }
          repeatedSequences.push({
            positions: [position, newPosition],
            values: repeatedValues,
            sumLogEntropy: calculateSequenceEntropyScore(repeatedValues)
          });
        }
        positions.push(newPosition);
        positionsByValue.set(cellValue, positions);
      }
    }
  }
  return repeatedSequences;
}

function findDuplicateValues(
  matrix: unknown[][]
): { value: number; numOccurences: number; entropy: number }[] {
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

  return duplicateValuesSortedByEntropy;
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
