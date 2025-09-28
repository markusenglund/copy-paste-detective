import { DuplicateValue } from "../entities/DuplicateValue";
import { DuplicateRow } from "../entities/DuplicateRow";
import { RepeatedColumnSequence } from "../entities/RepeatedColumnSequence";
import { ExcelFileData } from "./ExcelFileData";
import { CategorizedColumn } from "../columnCategorization/columnCategorization";

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
  sequences: RepeatedColumnSequence[];
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
  categorizedColumnsBySheet: Map<string, CategorizedColumn[]>;
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
