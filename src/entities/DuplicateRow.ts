import { Sheet } from "./Sheet";
import { DuplicateCellPair } from "./DuplicateCellPair";

export class DuplicateRow {
  public readonly rowIndices: [number, number];
  public readonly sharedValues: number[];
  public readonly sharedColumns: number[];
  public readonly totalSharedCount: number;
  public readonly sheet: Sheet;
  public readonly rowEntropyScore: number;

  constructor(
    rowIndices: [number, number],
    sharedValues: number[],
    sharedColumns: number[],
    totalSharedCount: number,
    sheet: Sheet,
    rowEntropyScore: number
  ) {
    this.rowIndices = rowIndices;
    this.sharedValues = sharedValues;
    this.sharedColumns = sharedColumns;
    this.totalSharedCount = totalSharedCount;
    this.sheet = sheet;
    this.rowEntropyScore = rowEntropyScore;
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
}