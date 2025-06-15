import { Sheet } from "../entities/Sheet";
import { DuplicateValue } from "../entities/DuplicateValue";
import { DuplicateRow } from "../entities/DuplicateRow";
import { RepeatedSequence } from "./index";
import { CategorizeColumnsFunction } from "../ai/ColumnCategorizer";

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

export interface StrategyDependencies {
  categorizeColumns?: CategorizeColumnsFunction;
  previousResults?: AllStrategyResults[];
}

export interface Strategy<T extends StrategyResult> {
  name: string;
  execute(
    sheets: Sheet[], 
    context: StrategyContext, 
    dependencies?: StrategyDependencies
  ): Promise<T>;
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
