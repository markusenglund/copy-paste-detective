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

Suspicion Score: ${params.originalAiReview.suspicionScore}/10`;

  // Follow-up prompt asking to analyze the PDF
  const followUpPrompt = `Please read through the attached PDF of the paper and do the following:
1. Identify the specific columns that have duplicated cells. Then tell me whether they were used to calculate any results of the paper.
2. Identify which specific conclusions might be affected by the data issues. Please provide specific quotes or figures from the paper.
3. Give the data issues an impact score, which describes how seriously the data issues might impact the paper's conclusions on a scale from 1 to 5.

Instructions:
- If none of the columns containing duplicated values are used to calculate any of the paper's results, the impact score should always be 1. In these cases, it doesn't matter how widespread the issue is.
- Your job is to assess how seriously the data issues might impact the paper's conclusionsn, _not_ what the authors' intentions were and definitely _NOT_ how suspicious you think the data issues look. 


Examples of impact scores:
- 1: The problematic data are not referenced in the paper at all
- 2: Only a single row with issues in a larger dataset, leaving conclusions largely unaffected.
- 3: Multiple rows with issues, but only secondary or supporting conclusions are affected.
- 4: Multiple rows with issues in data that directly affect the primary result.
- 5: Widespread issues that affect all primary conclusions.
`;

  return {
    originalUserPrompt: params.originalPrompt,
    modelResponse,
    followUpPrompt,
  };
}
