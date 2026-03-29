export interface ArticleForUpload {
  id: number;
  doi: string | null;
  title: string;
  fullPdfUrl: string | null;
  publicationDate: string | null;
  numCitations: number;
  pdfDownloadStatus: string | null;
  journalTitle: string | null;
  journalSjrScore: number | null;
  truePositiveProbability: number | null;
  impactScore: number | null;
  citationScore: number;
  subfield: string | null;
  countryCode: string | null;
  pdfFilename: string | null;
  pdfFileSize: number | null;
  dryadDatasetId: number | null;
  dryadExtId: number | null;
  humanReviewVerdict: "true_positive" | "false_positive" | "ambiguous" | null;
  humanReviewImpactScore: number | null;
  humanReviewUpdatedAt: string | null;
  tags: Array<{ id: string; name: string; color: string }>;
}
