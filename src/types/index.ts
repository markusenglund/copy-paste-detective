
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

import { DuplicateValue } from "../entities/DuplicateValue";
import { DuplicateRow } from "../entities/DuplicateRow";

export type DuplicateValuesResult = {
  duplicateValuesSortedByEntropy: DuplicateValue[];
  duplicatedValuesAboveThresholdSortedByOccurences: DuplicateValue[];
};

export type DuplicateRowsResult = {
  duplicateRows: DuplicateRow[];
};
