import { Sheet } from "./Sheet";
import { DuplicateCellPair } from "./DuplicateCellPair";
import { SuspicionLevel } from "../types";
import {
  calculateNumberEntropy,
  calculateEntropyScore
} from "../utils/entropy";

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
    numComparedColumns: number
  ) {
    this.rowIndices = rowIndices;
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

  get rowEntropyScoresSum(): number {
    if (this.sharedValues.length === 0) {
      return 0;
    }

    const sumEntropyScores = this.sharedValues.reduce((acc, value) => {
      const rawNumberEntropy = calculateNumberEntropy(value);
      const individualEntropyScore = calculateEntropyScore(rawNumberEntropy);
      return acc + individualEntropyScore;
    }, 0);

    return sumEntropyScores;
  }

  get rowEntropyScore(): number {
    // Adjust the score based on the number of compared columns
    const rowEntropyScore =
      this.rowEntropyScoresSum / Math.pow(this.numComparedColumns, 1 / 3);

    return rowEntropyScore;
  }

  get suspicionLevel(): SuspicionLevel {
    if (this.rowEntropyScore > 40) {
      return SuspicionLevel.High;
    } else if (this.rowEntropyScore > 10) {
      return SuspicionLevel.Medium;
    } else if (this.rowEntropyScore > 5) {
      return SuspicionLevel.Low;
    } else {
      return SuspicionLevel.None;
    }
  }
}
