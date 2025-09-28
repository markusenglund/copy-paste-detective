import { Sheet } from "./Sheet";
import { EnhancedCell } from "./EnhancedCell";
import { SuspicionLevel } from "../types";
import {
  calculateEntropyScore,
  calculateNumberEntropy,
} from "../utils/entropy";
import { CategorizedColumn } from "../columnCategorization/columnCategorization";

export class DuplicateValue {
  public readonly value: number;
  public readonly entropy: number;
  public readonly sheet: Sheet;
  public readonly cells: EnhancedCell[];

  constructor(
    value: number,
    sheet: Sheet,
    cells: EnhancedCell[],
    categorizedColumn: CategorizedColumn,
  ) {
    this.value = value;
    this.sheet = sheet;
    this.cells = cells;
    this.entropy = calculateNumberEntropy(value, categorizedColumn);
  }

  get numOccurences(): number {
    return this.cells.length;
  }

  get numberEntropyScore(): number {
    const minEntropy = 1000;
    if (this.entropy < minEntropy) {
      return 0;
    }
    const rawEntropyScore = calculateEntropyScore(this.entropy);
    return rawEntropyScore;
  }

  get occurenceAdjustedEntropyScore(): number {
    // Properly balance entropyscore and occurences by giving entropy score slightly higher impact
    const occurenceAdjustedEntropy =
      Math.pow(this.numberEntropyScore, 1.5) * Math.log2(this.numOccurences);
    return occurenceAdjustedEntropy;
  }

  get matrixSizeAdjustedEntropyScore(): number {
    return (
      this.occurenceAdjustedEntropyScore / this.sheet.logNumberCountModifier
    );
  }

  get suspicionLevel(): SuspicionLevel {
    const score = this.matrixSizeAdjustedEntropyScore;
    if (score > 40) {
      return SuspicionLevel.High;
    } else if (score > 22) {
      return SuspicionLevel.Medium;
    } else if (score > 15) {
      return SuspicionLevel.Low;
    } else {
      return SuspicionLevel.None;
    }
  }
}
