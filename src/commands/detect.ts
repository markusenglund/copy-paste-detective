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
    const data = xlsx.utils.sheet_to_json(sheet, { raw: true, header: 1 });
    console.log("Excel file loaded:", data.length, "rows");

    const numOccurencesByNumericCellValue = new Map<number, number>();
    for (const row of data) {
      if (Array.isArray(row)) {
        for (const cell of row) {
          if (typeof cell === "number") {
            const numOccurences =
              numOccurencesByNumericCellValue.get(cell) ?? 0;
            numOccurencesByNumericCellValue.set(cell, numOccurences + 1);
          }
        }
      } else {
        throw new Error("Row is not an array");
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

program.parse();
