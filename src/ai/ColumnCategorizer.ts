import { Sheet } from "../entities/Sheet";
import { StrategyContext } from "../types/strategies";

export interface ColumnCategorizationParams {
  sheet: Sheet;
  context: StrategyContext;
  dataDescription: string;
}

export interface ColumnCategorization {
  unique: string[];
  shared: string[];
}

export type CategorizeColumnsFunction = (params: ColumnCategorizationParams) => Promise<ColumnCategorization>;