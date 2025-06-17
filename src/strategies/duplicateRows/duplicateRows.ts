import {
  DuplicateRowsResult,
  Strategy,
  StrategyName,
} from "../../types/strategies";
import { runDuplicateRowsStrategy } from "./runDuplicateRowsStrategy";
import { printDuplicateRowsResults } from "./printDuplicateRowsResults";

const duplicateRowsStrategy: Strategy<DuplicateRowsResult> = {
  name: StrategyName.DuplicateRows,
  execute: runDuplicateRowsStrategy,
  printResults: printDuplicateRowsResults,
};

export default duplicateRowsStrategy;
