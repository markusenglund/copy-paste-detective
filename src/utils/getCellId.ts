import xlsx from "xlsx";

export function getCellId(rowIndex: number, columnIndex: number): string {
  return xlsx.utils.encode_cell({ r: rowIndex, c: columnIndex });
}
