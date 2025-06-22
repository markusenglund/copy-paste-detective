import { Sheet } from "./Sheet";
import { DuplicateCellPair } from "./DuplicateCellPair";
import { SuspicionLevel } from "../types";
import { calculateSequenceEntropyScore } from "../utils/entropy";

export class DuplicateRow {
  public readonly rowIndices: [number, number];
  public readonly sharedValues: number[];
  public readonly sharedColumns: number[];
  public readonly totalSharedCount: number;
  public readonly sheet: Sheet;
  public readonly numComparedColumns: number;

  constructor(
    rowIndices: [number, number],
    sharedValues: number[],
    sharedColumns: number[],
    totalSharedCount: number,
    sheet: Sheet,
    numComparedColumns: number,
  ) {
    this.rowIndices = rowIndices.toSorted((a, b) => a - b) as [number, number];
    this.sharedValues = sharedValues;
    this.sharedColumns = sharedColumns;
    this.totalSharedCount = totalSharedCount;
    this.sheet = sheet;
    this.numComparedColumns = numComparedColumns;
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

  get rowEntropyScore(): number {
    return calculateSequenceEntropyScore(this.sharedValues);
  }

  get matrixSizeAdjustedEntropyScore(): number {
    return this.rowEntropyScore / this.sheet.logNumberCountModifier;
  }

  get suspicionLevel(): SuspicionLevel {
    if (this.matrixSizeAdjustedEntropyScore > 16) {
      return SuspicionLevel.High;
    } else if (this.matrixSizeAdjustedEntropyScore > 9) {
      return SuspicionLevel.Medium;
    } else if (this.matrixSizeAdjustedEntropyScore > 7) {
      return SuspicionLevel.Low;
    } else {
      return SuspicionLevel.None;
    }
  }
}
