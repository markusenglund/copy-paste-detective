import xlsx from "xlsx";
import { roundFloatingPointInaccuracies } from "../utils/roundFloatingPointInaccuracies";
import { getCellId } from "../utils/getCellId";

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
    const rawValue = originalCell?.v ?? null;
    this.value =
      typeof rawValue === "number"
        ? roundFloatingPointInaccuracies(rawValue)
        : rawValue;
  }

  get cellId(): string {
    return getCellId(this.row, this.col);
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

    // TODO: This part can probably be removed, but needs to check if the z property is set on date columns
    // For numeric cells, check if the formatted value looks like a date
    if (this.originalCell.t === "n" && this.originalCell.w) {
      // Common date patterns: MM/DD/YY, MM/DD/YYYY, M/D/YY, etc., or Month-YYYY (e.g., Apr-2023)
      const datePattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$|^[A-Za-z]{3}-\d{4}$/;
      if (datePattern.test(this.originalCell.w)) {
        return true;
      }
    }

    if (!this.originalCell.z) {
      return false;
    }
    return xlsx.SSF.is_date(this.originalCell.z);
  }

  private get isNumeric(): boolean {
    return typeof this.value === "number" && !this.isDate;
  }

  private get isFormula(): boolean {
    return this.originalCell?.f !== undefined;
  }

  get isAnalyzable(): boolean {
    return this.isNumeric && !this.isFormula;
  }
}
