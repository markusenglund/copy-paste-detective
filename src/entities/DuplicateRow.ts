import { Sheet } from "./Sheet";
import { DuplicateCellPair } from "./DuplicateCellPair";
import { SuspicionLevel } from "../types";
import { calculateRowEntropyScore } from "../utils/entropy";
import { CategorizedColumn } from "../columnCategorization/columnCategorization";

export class DuplicateRow {
  public readonly rowIndices: [number, number];
  public readonly sharedValues: number[];
  public readonly sharedColumns: number[];
  public readonly totalSharedCount: number;
  public readonly sheet: Sheet;
  public readonly numComparedColumns: number;
  private readonly categorizedColumns: CategorizedColumn[];

  constructor(
    rowIndices: [number, number],
    sharedValues: number[],
    sharedColumns: number[],
    totalSharedCount: number,
    sheet: Sheet,
    numComparedColumns: number,
    categorizedColumns: CategorizedColumn[],
  ) {
    this.rowIndices = rowIndices.toSorted((a, b) => a - b) as [number, number];
    this.sharedValues = sharedValues;
    this.sharedColumns = sharedColumns;
    this.totalSharedCount = totalSharedCount;
    this.sheet = sheet;
    this.numComparedColumns = numComparedColumns;
    this.categorizedColumns = categorizedColumns;
  }

  get duplicateCellPairs(): DuplicateCellPair[] {
    const pairs: DuplicateCellPair[] = [];

    for (const columnIndex of this.sharedColumns) {
      const cell1 = this.sheet.enhancedMatrix[this.rowIndices[0]][columnIndex];
      const cell2 = this.sheet.enhancedMatrix[this.rowIndices[1]][columnIndex];

      if (cell1 && cell2) {
        pairs.push(new DuplicateCellPair(cell1, cell2));
      }
    }

    return pairs;
  }

  get deduplicatedSharedValues(): number[] {
    return [...new Set(this.sharedValues)];
  }

  get rowEntropyScore(): number {
    const categorizedColumns: CategorizedColumn[] = [];
    const sharedValues: number[] = [];
    const seenSharedValues = new Set<number>();
    for (let i = 0; i < this.sharedValues.length; i++) {
      const value = this.sharedValues[i];
      if (!seenSharedValues.has(value)) {
        seenSharedValues.add(value);
        sharedValues.push(value);
        const colIndex = this.sharedColumns[i];
        const categorizedColumn = this.categorizedColumns[colIndex];
        categorizedColumns.push(categorizedColumn);
      }
    }
    return calculateRowEntropyScore(sharedValues, categorizedColumns);
  }

  get matrixSizeAdjustedEntropyScore(): number {
    return this.rowEntropyScore / this.sheet.logNumberCountModifier;
  }

  get suspicionLevel(): SuspicionLevel {
    if (this.matrixSizeAdjustedEntropyScore > 16) {
      return SuspicionLevel.High;
    } else if (this.matrixSizeAdjustedEntropyScore > 9) {
      return SuspicionLevel.Medium;
    } else if (this.matrixSizeAdjustedEntropyScore > 6) {
      return SuspicionLevel.Low;
    } else {
      return SuspicionLevel.None;
    }
  }
}
