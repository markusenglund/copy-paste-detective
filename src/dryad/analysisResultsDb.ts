import { JSONFilePreset } from "lowdb/node";

export type AnalysisResults = {
  filename: string;
  duplicateRowEntropyScores: number[];
  columnSequencesEntropyScores: number[];
  analysisVersion: string;
};
type AnalysisResultsData = {
  results: {
    [datasetExtId: number]: {
      [filename: string]: AnalysisResults;
    };
  };
};

const defaultData: AnalysisResultsData = {
  results: {},
};

export const db = await JSONFilePreset(
  "data/dryad/analysis-results.json",
  defaultData,
);
