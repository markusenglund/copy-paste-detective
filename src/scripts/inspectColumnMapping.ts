import path from "path";
import xlsx from "xlsx";
import { loadExcelFileWithoutMetadata } from "../utils/loadExcelFileWithoutMetadata";

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log("Usage: npm run inspect-column-mapping -- <colA> <colB>");
  console.log("  colA, colB  Excel column letters (e.g. AG, P)");
  console.log("Example: npm run inspect-column-mapping -- AG P");
  process.exit(1);
}

const colAIndex = xlsx.utils.decode_col(args[0]);
const colBIndex = xlsx.utils.decode_col(args[1]);

const filePath = path.resolve("data/dryad/files/162720/NP_Data.xlsx");
const excelFile = loadExcelFileWithoutMetadata(filePath);
const sheet = excelFile.sheets[0];

const colAName = sheet.columnNames[colAIndex] ?? "unknown";
const colBName = sheet.columnNames[colBIndex] ?? "unknown";

console.log(`Sheet: ${sheet.name}`);
console.log(`Column ${args[0]} (index ${colAIndex}): ${colAName}`);
console.log(`Column ${args[1]} (index ${colBIndex}): ${colBName}`);
console.log();

// colA value -> (colB value -> row numbers in 1-indexed Excel rows)
const mapping = new Map<string, Map<string, number[]>>();

for (
  let rowIdx = sheet.firstDataRowIndex;
  rowIdx < sheet.enhancedMatrix.length;
  rowIdx++
) {
  const row = sheet.enhancedMatrix[rowIdx];
  const aVal = String(row[colAIndex]?.value ?? "");
  const bVal = String(row[colBIndex]?.value ?? "");

  if (!aVal || aVal === "null") continue;

  if (!mapping.has(aVal)) {
    mapping.set(aVal, new Map());
  }
  const bMap = mapping.get(aVal)!;
  if (!bMap.has(bVal)) {
    bMap.set(bVal, []);
  }
  // +1 to convert to 1-indexed Excel row numbers
  bMap.get(bVal)!.push(rowIdx + 1);
}

// Filter to colA values with more than one unique colB value
const conflicts = [...mapping.entries()].filter(([, bMap]) => bMap.size > 1);

if (conflicts.length === 0) {
  console.log(
    `No conflicts found: each ${colAName} value maps to exactly one ${colBName} value.`,
  );
} else {
  console.log(
    `Found ${conflicts.length} ${colAName} value(s) with multiple ${colBName} values:`,
  );
  console.log();
  for (const [aVal, bMap] of conflicts) {
    console.log(`${colAName} = ${aVal}`);
    for (const [bVal, rows] of bMap) {
      console.log(`  ${colBName} = ${bVal}  (rows: ${rows.join(", ")})`);
    }
    console.log();
  }
}
