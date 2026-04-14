import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

export const storagePaths = {
  dryad: path.join(STORAGE_ROOT, "dryad"),
  dryadDataset: (extId: string | number): string =>
    path.join(STORAGE_ROOT, "dryad", extId.toString()),
  jsonStore: path.join(STORAGE_ROOT, "json-store"),
  highlightedFiles: path.join(STORAGE_ROOT, "highlighted-files"),
  highlightedDataset: (extId: string | number): string =>
    path.join(STORAGE_ROOT, "highlighted-files", extId.toString()),
  pmc: path.join(STORAGE_ROOT, "pmc"),
  pmcArticle: (pmcid: string): string => path.join(STORAGE_ROOT, "pmc", pmcid),
  other: path.join(STORAGE_ROOT, "other"),
};
