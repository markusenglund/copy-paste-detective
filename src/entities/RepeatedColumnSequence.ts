import { SuspicionLevel } from "../types";
import { Sheet } from "./Sheet";
import { calculateColumnSequenceEntropyScore } from "../utils/entropy";
import { calculateSequenceRegularity } from "../utils/sequence";
import { CategorizedColumn } from "../columnCategorization/columnCategorization";
import { Column } from "./Column";

export type Position = {
  column: number;
  startRow: number;
  cellId: string;
};

export type ColumnSequence = {
  startRowIndex: number;
  startCellId: string;
  column: Column;
};

export class RepeatedColumnSequence {
  sequences: [ColumnSequence, ColumnSequence];
  values: number[];
  sequenceEntropyScore: number;
  adjustedSequenceEntropyScore: number;
  matrixSizeAdjustedEntropyScore: number;
  numberCount: number;
  sheetName: string;

  constructor(data: {
    sequences: [ColumnSequence, ColumnSequence];
    values: number[];
    sheet: Sheet;
    categorizedColumn: CategorizedColumn;
  }) {
    this.sequences = data.sequences;
    this.values = data.values;
    this.sheetName = data.sheet.name;
    this.numberCount = data.sheet.numNumericCells;

    // Calculate entropy scores
    this.sequenceEntropyScore = calculateColumnSequenceEntropyScore(
      data.values,
      data.categorizedColumn,
    );

    const { mostCommonIntervalSizePercentage } = calculateSequenceRegularity(
      data.values,
    );
    this.adjustedSequenceEntropyScore =
      this.sequenceEntropyScore * (1 - mostCommonIntervalSizePercentage);

    this.matrixSizeAdjustedEntropyScore =
      this.adjustedSequenceEntropyScore / data.sheet.logNumberCountModifier;
  }

  get suspicionLevel(): SuspicionLevel {
    if (this.matrixSizeAdjustedEntropyScore > 16) {
      return SuspicionLevel.High;
    } else if (this.matrixSizeAdjustedEntropyScore > 9) {
      return SuspicionLevel.Medium;
    } else if (this.matrixSizeAdjustedEntropyScore > 7) {
      return SuspicionLevel.Low;
    } else {
      return SuspicionLevel.None;
    }
  }
}
