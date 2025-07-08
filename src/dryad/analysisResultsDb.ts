import { JSONFilePreset } from "lowdb/node";

export type AnalysisResults = {
  duplicateRowEntropyScores: number[];
  columnSequencesEntropyScores: number[];
  analysisVersion: string;
  fileIndex: number;
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
