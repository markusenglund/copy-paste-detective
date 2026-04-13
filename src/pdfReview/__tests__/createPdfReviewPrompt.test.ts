import { createPdfReviewPrompt } from "../createPdfReviewPrompt";

describe("createPdfReviewPrompt", () => {
  it("should strip the full text block from originalPrompt", () => {
    const originalPrompt = `Here is some intro text.

# Context from the paper

The following caption was provided for this data file:

\`\`\`
Figure 1. Data
\`\`\`

The following is the full text of the paper. Use it to understand what the data represents and whether the flagged duplications make sense in context.

\`\`\`
Abstract
Background: ...
Methods: ...
Conclusion: ...
\`\`\`

# Special columns
...`;

    const result = createPdfReviewPrompt({
      originalPrompt,
      articleTitle: "Test Article",
      excelFileName: "data.xlsx",
      sheetName: "Sheet1",
      originalAiReview: "It looks suspicious.",
    });

    // The full text code block and preamble should be replaced
    expect(result.originalUserPrompt).not.toContain(
      "The following is the full text of the paper.",
    );
    expect(result.originalUserPrompt).toContain(
      "[Full text of the paper was provided here during the previous step to establish context]",
    );
    // But other code blocks like the caption should be intact
    expect(result.originalUserPrompt).toContain("Figure 1. Data");
    expect(result.originalUserPrompt).toContain("Here is some intro text.");
  });

  it("should correctly handle single backticks inside the full text code block", () => {
    const originalPrompt = `The following is the full text of the paper. Use it to understand what the data represents and whether the flagged duplications make sense in context.

\`\`\`\`
Here is some full text that has \`inline code\` and even
\`\`\`
nested blocks
\`\`\`
inside it.
\`\`\`\`

# End
`;
    // Create the pdf review prompt
    const result = createPdfReviewPrompt({
      originalPrompt,
      articleTitle: "Test",
      excelFileName: "test.xlsx",
      sheetName: "Sheet1",
      originalAiReview: "test review",
    });

    expect(result.originalUserPrompt).not.toContain(
      "The following is the full text of the paper.",
    );
    expect(result.originalUserPrompt).toContain(
      "[Full text of the paper was provided here during the previous step to establish context]",
    );
    expect(result.originalUserPrompt).toContain("# End");
  });

  it("should not modify prompt if the full text phrase is not found", () => {
    const originalPrompt = `Just a plain prompt without full text.
\`\`\`
some code
\`\`\`
`;
    const result = createPdfReviewPrompt({
      originalPrompt,
      articleTitle: "Test",
      excelFileName: "test.xlsx",
      sheetName: "Sheet1",
      originalAiReview: "test review",
    });

    expect(result.originalUserPrompt).toBe(originalPrompt);
  });
});
