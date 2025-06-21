import { Sheet } from "./Sheet";
import { EnhancedCell } from "./EnhancedCell";
import { SuspicionLevel } from "../types";

export class DuplicateValue {
  public readonly value: number;
  public readonly entropy: number;
  public readonly sheet: Sheet;
  public readonly cells: EnhancedCell[];

  constructor(
    value: number,
    entropy: number,
    sheet: Sheet,
    cells: EnhancedCell[],
  ) {
    this.value = value;
    this.entropy = entropy;
    this.sheet = sheet;
    this.cells = cells;
  }

  get numOccurences(): number {
    return this.cells.length;
  }

  get entropyScore(): number {
    const occurenceAdjustedEntropy =
      this.entropy * Math.log2(this.numOccurences);
    return occurenceAdjustedEntropy;
  }

  get matrixSizeAdjustedEntropyScore(): number {
    const matrixSize = this.sheet.numNumericCells;
    return this.entropyScore / Math.log2(matrixSize);
  }

  get suspicionLevel(): SuspicionLevel {
    const score = this.matrixSizeAdjustedEntropyScore;
    if (score > 10_000_000) {
      return SuspicionLevel.High;
    } else if (score > 100_000) {
      return SuspicionLevel.Medium;
    } else if (score > 2_000) {
      return SuspicionLevel.Low;
    } else {
      return SuspicionLevel.None;
    }
  }
}
