import { SuspicionLevel } from "../types/index.js";

export type Position = {
  column: number;
  startRow: number;
  cellId: string;
};

export class RepeatedColumnSequence {
  positions: [Position, Position];
  values: number[];
  sequenceEntropyScore: number;
  adjustedSequenceEntropyScore: number;
  matrixSizeAdjustedEntropyScore: number;
  numberCount: number;
  sheetName: string;

  constructor(data: {
    positions: [Position, Position];
    values: number[];
    sequenceEntropyScore: number;
    adjustedSequenceEntropyScore: number;
    matrixSizeAdjustedEntropyScore: number;
    numberCount: number;
    sheetName: string;
  }) {
    this.positions = data.positions;
    this.values = data.values;
    this.sequenceEntropyScore = data.sequenceEntropyScore;
    this.adjustedSequenceEntropyScore = data.adjustedSequenceEntropyScore;
    this.matrixSizeAdjustedEntropyScore = data.matrixSizeAdjustedEntropyScore;
    this.numberCount = data.numberCount;
    this.sheetName = data.sheetName;
  }

  get suspicionLevel(): SuspicionLevel {
    if (this.matrixSizeAdjustedEntropyScore > 10) {
      return SuspicionLevel.High;
    } else if (this.matrixSizeAdjustedEntropyScore > 5) {
      return SuspicionLevel.Medium;
    } else if (this.matrixSizeAdjustedEntropyScore > 4) {
      return SuspicionLevel.Low;
    } else {
      return SuspicionLevel.None;
    }
  }
}
