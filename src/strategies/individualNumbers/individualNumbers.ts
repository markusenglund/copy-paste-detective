import {
  IndividualNumbersResult,
  Strategy,
  StrategyName
} from "../../types/strategies";
import { runIndividualNumbersStrategy } from "./runIndividualNumbersStrategy";
import { printIndividualNumbersResults } from "./printIndividualNumbersResults";

const individualNumbersStrategy: Strategy<IndividualNumbersResult> = {
  name: StrategyName.IndividualNumbers,
  execute: runIndividualNumbersStrategy,
  printResults: printIndividualNumbersResults
};

export default individualNumbersStrategy;