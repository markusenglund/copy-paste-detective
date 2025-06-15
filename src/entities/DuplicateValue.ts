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
    cells: EnhancedCell[]
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
    return this.entropy * Math.log2(this.numOccurences);
  }

  get suspicionLevel(): SuspicionLevel {
    const score = this.entropyScore;
    
    if (score > 20_000_000) {
      return SuspicionLevel.High;
    } else if (score > 200_000) {
      return SuspicionLevel.Medium;
    } else if (score > 20_000) {
      return SuspicionLevel.Low;
    } else {
      return SuspicionLevel.None;
    }
  }
}