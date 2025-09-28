import { DuplicateRowsResult } from "../../types/strategies";
import { calculateBaseNumberEntropy } from "../../utils/entropy";
import { levelToSymbol } from "../../utils/output";

export function printDuplicateRowsResults({
  duplicateRows,
}: DuplicateRowsResult): void {
  if (duplicateRows.length === 0) {
    console.log(`\n✅ No duplicate rows found in unique columns!`);
    return;
  }

  const sortedDuplicateRows = duplicateRows
    .toSorted((a, b) => b.rowEntropyScore - a.rowEntropyScore)
    .slice(0, 20); // Show top 20 most suspicious pairs

  const tableData = sortedDuplicateRows.map((duplicateRow) => {
    // Format shared values for display (show first few if many)
    const sortedSharedValues = duplicateRow.sharedValues.toSorted((a, b) => {
      const entropyA = calculateBaseNumberEntropy(a);
      const entropyB = calculateBaseNumberEntropy(b);
      return entropyB - entropyA;
    });
    const sharedValuesDisplay =
      sortedSharedValues.length > 3
        ? `${sortedSharedValues.slice(0, 3).join(", ")} (+${sortedSharedValues.length - 3})`
        : sortedSharedValues.join(", ");

    let sharedColumnsDisplay = duplicateRow.sharedColumns
      .map((colIndex: number) => {
        const columnLetter = getColumnLetter(colIndex);
        return columnLetter;
      })
      .join(", ");
    if (sharedColumnsDisplay.length > 30) {
      sharedColumnsDisplay = `${sharedColumnsDisplay.slice(0, 30)}...`;
    }

    return {
      level: levelToSymbol[duplicateRow.suspicionLevel],
      sheetName: duplicateRow.sheet.name,
      sharedValues: sharedValuesDisplay,
      length: duplicateRow.totalSharedCount,
      entropy: duplicateRow.rowEntropyScore.toFixed(1),
      sizeAdj: duplicateRow.matrixSizeAdjustedEntropyScore.toFixed(1),
      sharedColumns: sharedColumnsDisplay,
      row1: duplicateRow.rowIndices[0] + 1, // Convert to 1-based indexing for display
      row2: duplicateRow.rowIndices[1] + 1,
    };
  });

  console.log(
    `\nDuplicate rows (${duplicateRows.length} total, showing top ${tableData.length}):`,
  );
  console.table(tableData);
}

function getColumnLetter(columnIndex: number): string {
  let columnLetters = "";
  let dividend = columnIndex;
  do {
    const remainder = dividend % 26;
    columnLetters = String.fromCharCode(65 + remainder) + columnLetters;
    dividend = Math.floor(dividend / 26) - 1;
  } while (dividend >= 0);
  return columnLetters;
}
