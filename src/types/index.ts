export enum SuspicionLevel {
  None = "None",
  Low = "Low",
  Medium = "Medium",
  High = "High",
}

import { DuplicateValue } from "../entities/DuplicateValue";
import { DuplicateRow } from "../entities/DuplicateRow";

export type DuplicateValuesResult = {
  duplicateValues: DuplicateValue[];
};

export type DuplicateRowsResult = {
  duplicateRows: DuplicateRow[];
};
