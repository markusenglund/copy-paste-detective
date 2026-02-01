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

  // Step 3: AI Review Results
  aiReviewStatus: {
    total: number; // datasets with at least one non-obsolete ai_review_result
    breakdown: {
      suspicious: number; // datasets with suspicious findings (>50%)
      notSuspicious: number; // datasets with no suspicious findings
    };
  };

  // Step 4: PDF Review Pipeline (for suspicious datasets)
  pdfPipeline: {
    pdfNotDownloaded: number; // suspicious datasets with article but no PDF
    pdfDownloadedNotReviewed: number; // suspicious datasets with PDF but no review
    pdfReviewedHighImpact: number; // impactScore >= 3
    pdfReviewedLowImpact: number; // impactScore <= 2
  };

  // Percentages for funnel visualization
  percentages: {
    downloadedOfIndexed: number;
    analyzedOfDownloaded: number;
    aiReviewedOfAnalyzed: number; // Step 3: suspicious / flagged
    pdfReviewedOfSuspicious: number; // Step 4: highImpact / suspicious
  };
}
