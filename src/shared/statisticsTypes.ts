export interface StatisticsResponse {
  // Overview
  totalDatasets: number;
  totalExcelFiles: number;
  totalArticles: number;

  // Download funnel
  downloadStatus: {
    completed: number;
    failed: number; // includes: failed, api_forbidden, api_not_found
    notStarted: number;
    inProgress: number;
    skipped: number; // manually_added also counts here
  };

  // Analysis funnel (of downloaded datasets)
  analysisStatus: {
    analyzed: number; // total successfully analyzed
    breakdown: {
      notFlagged: number; // not_flagged_for_review
      flagged: number; // flagged_for_review
      reviewedByAi: number; // reviewed_by_ai
      pdfReviewedByAi: number; // pdf_reviewed_by_ai
    };
    failed: number;
    notAnalyzed: number; // excluding failed
  };

  // Suspicious datasets pipeline
  suspiciousDatasets: {
    total: number; // datasets with at least one aiReview with truePositiveProbability > 0.5
    withArticle: number;
    withPdf: number;
    pdfReviewed: number;
    pdfReviewBreakdown: {
      highImpact: number; // impactScore >= 3
      lowImpact: number; // impactScore <= 2
    };
  };

  // Percentages for funnel visualization
  percentages: {
    downloadedOfIndexed: number;
    analyzedOfDownloaded: number;
    flaggedOfAnalyzed: number;
    pdfReviewedOfFlagged: number;
  };
}
