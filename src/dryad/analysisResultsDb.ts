import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
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

const dbPath = "data/dryad/analysis-results.json";
await mkdir(dirname(dbPath), { recursive: true });

export const db = await JSONFilePreset(
  dbPath,
  defaultData,
);
