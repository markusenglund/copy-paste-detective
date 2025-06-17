import { DuplicateValue } from "../entities/DuplicateValue";
import { DuplicateRow } from "../entities/DuplicateRow";
import { RepeatedSequence } from "./index";
import { CategorizeColumnsFunction } from "../ai/ColumnCategorizer";
import { ExcelFileData } from "./ExcelFileData";

export interface StrategyResult {
  name: string;
  executionTime: number;
}

export interface IndividualNumbersResult extends StrategyResult {
  name: StrategyName.IndividualNumbers;
  duplicateValues: DuplicateValue[];
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
  categorizeColumnsBySheet?: Map<string, CategorizeColumnsFunction>;
  previousResults?: AllStrategyResults[];
}

export interface Strategy<T extends StrategyResult> {
  name: string;
  execute(
    excelFileData: ExcelFileData,
    dependencies?: StrategyDependencies,
  ): T | Promise<T>;
  printResults(result: T): void;
}

export enum StrategyName {
  IndividualNumbers = "individualNumbers",
  RepeatedColumnSequences = "repeatedColumnSequences",
  DuplicateRows = "duplicateRows",
}
