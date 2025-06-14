import type { Sheet } from "../entities/Sheet.js";

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
};

export type DuplicateValuesResult = {
  duplicateValuesSortedByEntropy: DuplicateValue[];
  duplicatedValuesAboveThresholdSortedByOccurences: DuplicateValue[];
};

export type DuplicateRow = {
  rowIndices: [number, number];
  sharedValues: number[];
  sharedColumns: number[];
  totalSharedCount: number;
  sheet: Sheet;
  rowEntropyScore: number;
};

export type DuplicateRowsResult = {
  duplicateRows: DuplicateRow[];
};
