export type PdfReviewConversation = {
  originalUserPrompt: string;
  modelResponse: string;
  followUpPrompt: string;
};

export function createPdfReviewPrompt(params: {
  originalPrompt: string;
  articleTitle: string;
  articleAbstract?: string;
  excelFileName: string;
  sheetName: string;
  originalAiReview: {
    explanation: string;
    falsePositiveTheory: string;
    suspicionScore: number;
    impactScore: number;
  };
}): PdfReviewConversation {
  // Format model's response using the explanation and other fields
  const modelResponse = `${params.originalAiReview.explanation}

False Positive Theory: ${params.originalAiReview.falsePositiveTheory}

Suspicion Score: ${params.originalAiReview.suspicionScore}/10
Impact Score: ${params.originalAiReview.impactScore}/10`;

  // Follow-up prompt asking to analyze the PDF
  const followUpPrompt = `Please read through the attached PDF of the paper and identify which specific conclusions might be affected by the data issues. Please provide specific quotes or figures from the paper to support your analysis.
Then evaluate how seriously the data issues might impact the paper's conclusions on a scale from 1 to 10, based primarily on which conclusions are affected and how widespread the issues are.

Examples of impact scores:
- 1: The problematic data is not referenced in the paper at all
- 3: Only a single row with issues in a larger dataset, leaving conclusions largely unaffected.
- 5: Multiple rows with issues, but only secondary or supporting conclusions are affected.
- 7: Multiple rows with issues in data that directly affect the primary result.
- 9: Widespread issues that affect all primary conclusions.
`;

  return {
    originalUserPrompt: params.originalPrompt,
    modelResponse,
    followUpPrompt,
  };
}
