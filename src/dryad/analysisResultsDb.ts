import { join } from "node:path";
import { JSONFilePreset } from "lowdb/node";
import { storagePaths } from "../utils/paths/storagePaths";

export type AnalysisResults = {
  filename: string;
  duplicateRowEntropyScores: number[];
  columnSequencesEntropyScores: number[];
  analysisVersion: string;
};
type AnalysisResultsData = {
  results: {
    [datasetExtId: string]: {
      [filename: string]: AnalysisResults;
    };
  };
};

const defaultData: AnalysisResultsData = {
  results: {},
};

export const db = await JSONFilePreset(
  join(storagePaths.jsonStore, "analysis-results.json"),
  defaultData,
);
