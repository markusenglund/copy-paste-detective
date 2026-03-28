export interface AIReview {
  prompt: string;
  response: string;
  model: string;
  truePositiveProbability: number;
  createdAt: Date;
}

export interface PDFReview {
  prompt: string;
  response: string;
  model: string;
  impactScore: number;
  createdAt: Date;
}

export interface SheetReview {
  sheetName: string;
  excelFileName: string;
  hasHighlightedVersion: boolean;
  aiReview: AIReview;
  pdfReview: PDFReview | null;
}

export interface DatasetInfo {
  id: number;
  extId: number;
  doi: string;
  title: string;
  abstract: string | null;
}

export interface ArticleInfo {
  id: number;
  title: string;
  doi: string | null;
  citations: number | null;
  citationScore: number | null;
  publicationDate: Date | null;
  journalName: string | null;
  journalSjrScore: number | null;
  pdfFilename: string | null;
  pdfFileSize: number | null;
  authors: Array<{
    name: string;
    position: number;
    institution: string | null;
  }>;
  funders: Array<{
    displayName: string;
    rorId: string;
  }>;
}

export interface HumanReview {
  verdict: "true_positive" | "false_positive" | "ambiguous";
  impactScore: number;
  notes: string | null;
  updatedAt: Date;
  prosecutionStatusId: string;
  caseName: string | null;
  reviewerUsername: string;
  isLatestReview: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface DatasetDetails {
  dataset: DatasetInfo;
  article: ArticleInfo;
  humanReviews: HumanReview[];
  sheetReviews: SheetReview[];
  tags: Tag[];
}
