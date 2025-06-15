import { Sheet } from "./Sheet";
import { EnhancedCell } from "./EnhancedCell";

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
}