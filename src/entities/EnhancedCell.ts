import xlsx from "xlsx";
import { roundFloatingPointInaccuracies } from "../utils/roundFloatingPointInaccuracies";

export class EnhancedCell {
  public readonly value: unknown;
  public readonly originalCell: xlsx.CellObject | null;
  public readonly row: number;
  public readonly col: number;

  constructor(originalCell: xlsx.CellObject | null, row: number, col: number) {
    this.originalCell = originalCell;
    this.row = row;
    this.col = col;
    
    // Extract and process the value from the original cell
    const rawValue = originalCell?.v;
    this.value = typeof rawValue === "number" 
      ? roundFloatingPointInaccuracies(rawValue)
      : rawValue;
  }

  get cellId(): string {
    return xlsx.utils.encode_cell({ r: this.row, c: this.col });
  }

  get formattedValue(): string {
    return this.originalCell?.w || String(this.value || "");
  }

  get isDate(): boolean {
    if (!this.originalCell) return false;

    // Check if cell type is explicitly date
    if (this.originalCell.t === "d") {
      return true;
    }

    // For numeric cells, check if the formatted value looks like a date
    if (this.originalCell.t === "n" && this.originalCell.w) {
      // Common date patterns: MM/DD/YY, MM/DD/YYYY, M/D/YY, etc.
      const datePattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
      return datePattern.test(this.originalCell.w);
    }

    return false;
  }

  get isNumeric(): boolean {
    return typeof this.value === "number" && !this.isDate;
  }

  get isFormula(): boolean {
    return this.originalCell?.f !== undefined;
  }

  get isAnalyzable(): boolean {
    return this.isNumeric && !this.isFormula;
  }
}