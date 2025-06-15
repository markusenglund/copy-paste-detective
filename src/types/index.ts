import type { Sheet } from "../entities/Sheet.js";
import type { EnhancedCell } from "../entities/EnhancedCell";

export enum SuspicionLevel {
  None,
  Low,
  Medium,
  High
}

export type Position = {
  column: number;
  startRow: number;
  cellId: string;
};

export type RepeatedSequence = {
  positions: [Position, Position];
  values: number[];
  sequenceEntropyScore: number;
  adjustedSequenceEntropyScore: number;
  matrixSizeAdjustedEntropyScore: number;
  numberCount: number;
  sheetName: string;
};

export type DuplicateValue = {
  value: number;
  numOccurences: number;
  entropy: number;
  sheet: Sheet;
  cells: EnhancedCell[];
};

export type DuplicateValuesResult = {
  duplicateValuesSortedByEntropy: DuplicateValue[];
  duplicatedValuesAboveThresholdSortedByOccurences: DuplicateValue[];
};

export { DuplicateRow } from "../entities/DuplicateRow";
import { DuplicateRow } from "../entities/DuplicateRow";

export type DuplicateRowsResult = {
  duplicateRows: DuplicateRow[];
};
