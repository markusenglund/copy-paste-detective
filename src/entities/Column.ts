import { Sheet } from "./Sheet";

const maxHeaderChars = 60;
export class Column {
  public readonly index: number;
  private readonly sheet: Sheet;
  public readonly name: string;
  public readonly id: string;
  constructor(sheet: Sheet, index: number) {
    this.sheet = sheet;
    this.index = index;
    this.name = this.createCombinedColumnName();
    this.id = this.createColumnId();
  }

  private createCombinedColumnName(): string {
    const headers = this.sheet.headerRowIndices
      .map((rowIndex) =>
        this.sheet.getEffectiveValueForCell(rowIndex, this.index),
      )
      .filter((value) => typeof value === "string")
      // Prevent including ridiculously long headers which are probably just sheet headers
      .filter(
        (value, i, arr) =>
          !(arr.length > i + 1 && value.length > maxHeaderChars),
      )
      .map((value) => value.trim());
    return headers.join(" - ");
  }

  // Get the column letter(s) as seen in Excel.
  private createColumnId(): string {
    let result = "";
    let i = this.index;

    while (i >= 0) {
      result = String.fromCharCode(65 + (i % 26)) + result;
      i = Math.floor(i / 26) - 1;
    }

    return result;
  }
}
