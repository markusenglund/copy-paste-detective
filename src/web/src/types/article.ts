export interface ArticleForUpload {
  id: number;
  doi: string | null;
  title: string;
  fullPdfUrl: string | null;
  publicationDate: string | null;
  numCitations: number;
  pdfDownloadStatus: string | null;
  journalTitle: string | null;
  truePositiveProbability: number | null;
  impactScore: number | null;
  citationNormalizedPercentile: number | null;
  subfield: string | null;
  countryCode: string | null;
  pdfFilename: string | null;
  pdfFileSize: number | null;
  dryadDatasetId: number | null;
}
