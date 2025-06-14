import { Sheet } from "src/entities/Sheet";
import { DuplicateValue, RepeatedSequence, DuplicateRow } from "src/types";

export interface StrategyResult {
  name: string;
  executionTime: number;
}

export interface IndividualNumbersResult extends StrategyResult {
  name: StrategyName.IndividualNumbers;
  topEntropyDuplicates: DuplicateValue[];
  topOccurrenceHighEntropy: DuplicateValue[];
}

export interface RepeatedColumnSequencesResult extends StrategyResult {
  name: StrategyName.RepeatedColumnSequences;
  sequences: (RepeatedSequence & { sheetName: string })[];
}

export interface DuplicateRowsResult extends StrategyResult {
  name: StrategyName.DuplicateRows;
  duplicateRows: DuplicateRow[];
}

export type AllStrategyResults =
  | IndividualNumbersResult
  | RepeatedColumnSequencesResult
  | DuplicateRowsResult;

export interface Strategy<T extends StrategyResult> {
  name: string;
  execute(sheets: Sheet[], context: StrategyContext): Promise<T>;
  printResults(result: T): void;
}

export interface StrategyContext {
  excelDataFolder: string;
  excelFileName: string;
  articleName: string;
}

export enum StrategyName {
  IndividualNumbers = "individualNumbers",
  RepeatedColumnSequences = "repeatedColumnSequences",
  DuplicateRows = "duplicateRows"
}
