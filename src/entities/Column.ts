import { Sheet } from "./Sheet";

export class Column {
  public readonly index: number;
  public readonly sheet: Sheet;

  constructor(sheet: Sheet, index: number) {
    this.sheet = sheet;
    this.index = index;
  }

  get headers(): string[] {
    return this.sheet.headerRowIndices
      .map((rowIndex) =>
        this.sheet.getEffectiveValueForCell(rowIndex, this.index),
      )
      .filter((value) => typeof value === "string")
      .map((value) => value.trim());
  }

  get combinedColumnName(): string {
    return this.headers.join(" - ");
  }

  // Get the column letter(s) as seen in Excel.
  get columnId(): string {
    let result = "";
    let i = this.index;

    while (i >= 0) {
      result = String.fromCharCode(65 + (i % 26)) + result;
      i = Math.floor(i / 26) - 1;
    }

    return result;
  }
}
