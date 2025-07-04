export type DryadFile = {
  filename: string;
  size: number;
  fileId: number;
};

export type DryadDataset = {
  status: "indexed" | "downloaded" | "analyzed";
  extId: number;
  dryadDoi: string;
  originalFileSize?: number;
  title: string;
  abstract?: string;
  usageNotes?: string;
  primaryArticleLink?: string;
  journalIssn?: string;
  dryadPublicationDate: string;
  dryadLastModifiedDate: string;
  latestVersionId: number;
  excelFiles: DryadFile[];
  readmeFile?: DryadFile;
  indexedTimestamp: string;
  updatedTimestamp: string;
};
