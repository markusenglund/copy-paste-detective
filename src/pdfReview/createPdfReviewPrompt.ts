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
Then evaluate how seriously the data issues might impact the paper's conclusions on a scale from 1 to 10, where 1 means no impact and 10 means that the main conclusion is seriously affected.
`;

  return {
    originalUserPrompt: params.originalPrompt,
    modelResponse,
    followUpPrompt,
  };
}
