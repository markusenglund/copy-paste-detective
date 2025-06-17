export function calculateColumnId(columnIndex: number): string {
  let result = "";
  let index = columnIndex;

  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }

  return result;
}
