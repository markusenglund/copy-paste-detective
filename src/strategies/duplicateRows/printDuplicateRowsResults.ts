import { SuspicionLevel } from "src/types";
import { DuplicateRowsResult } from "src/types/strategies";
import { levelToSymbol } from "src/utils/output";

export function printDuplicateRowsResults({
  duplicateRows
}: DuplicateRowsResult): void {
  if (duplicateRows.length === 0) {
    console.log(`\n✅ No duplicate rows found in unique columns!`);
    return;
  }

  const sortedDuplicateRows = duplicateRows
    .toSorted((a, b) => b.rowEntropyScore - a.rowEntropyScore)
    .slice(0, 20); // Show top 20 most suspicious pairs

  const tableData = sortedDuplicateRows.map(duplicateRow => {
    let level = SuspicionLevel.None;
    if (duplicateRow.rowEntropyScore > 50) {
      level = SuspicionLevel.High;
    } else if (duplicateRow.rowEntropyScore > 20) {
      level = SuspicionLevel.Medium;
    } else if (duplicateRow.rowEntropyScore > 5) {
      level = SuspicionLevel.Low;
    }

    // Format shared values for display (show first few if many)
    const sharedValuesDisplay =
      duplicateRow.sharedValues.length > 2
        ? `${duplicateRow.sharedValues.slice(0, 2).join(", ")}... (+${duplicateRow.sharedValues.length - 3} more)`
        : duplicateRow.sharedValues.join(", ");

    // Format shared columns with both names and letters
    const columnNames = duplicateRow.sheet.columnNames;
    let sharedColumnsDisplay = duplicateRow.sharedColumns
      .map(colIndex => {
        const columnName = columnNames[colIndex] || `Col${colIndex}`;
        const columnLetter = getColumnLetter(colIndex);
        return `${columnName}(${columnLetter})`;
      })
      .join(", ");
    if (sharedColumnsDisplay.length > 40) {
      sharedColumnsDisplay = `${sharedColumnsDisplay.slice(0, 40)}...`;
    }

    return {
      level: levelToSymbol[level],
      sheetName: duplicateRow.sheet.name,
      row1: duplicateRow.rowIndices[0] + 1, // Convert to 1-based indexing for display
      row2: duplicateRow.rowIndices[1] + 1,
      sharedCount: duplicateRow.totalSharedCount,
      sharedValues: sharedValuesDisplay,
      sharedColumns: sharedColumnsDisplay,
      entropyScore: duplicateRow.rowEntropyScore.toFixed(1)
    };
  });

  console.log(
    `\nDuplicate rows (${duplicateRows.length} total, showing top ${tableData.length}):`
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
