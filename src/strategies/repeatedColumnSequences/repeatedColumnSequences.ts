import {
  RepeatedColumnSequencesResult,
  Strategy,
  StrategyName
} from "../../types/strategies";
import { runRepeatedColumnSequencesStrategy } from "./runRepeatedColumnSequencesStrategy";
import { printRepeatedColumnSequencesResults } from "./printRepeatedColumnSequencesResults";

const repeatedColumnSequencesStrategy: Strategy<RepeatedColumnSequencesResult> = {
  name: StrategyName.RepeatedColumnSequences,
  execute: runRepeatedColumnSequencesStrategy,
  printResults: printRepeatedColumnSequencesResults
};

export default repeatedColumnSequencesStrategy;