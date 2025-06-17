import { EnhancedCell } from "./EnhancedCell";

export class DuplicateCellPair {
  public readonly cells: [EnhancedCell, EnhancedCell];

  constructor(cell1: EnhancedCell, cell2: EnhancedCell) {
    this.cells = [cell1, cell2];
  }

  get id(): string {
    const cellIds = [this.cells[0].cellId, this.cells[1].cellId].sort();
    return `${cellIds[0]}-${cellIds[1]}`;
  }
}
