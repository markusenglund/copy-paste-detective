import { ArticleInsert } from "../repositories/articles/schema";
import { Work, WorkSearchResult } from "./schemas";

export function convertOpenalexArticle(
  openalexArticle: WorkSearchResult | Work,
  journalId?: number,
): {
  article: ArticleInsert;
} {
  const fullPdfUrl = openalexArticle.locations?.find(
    (location) => location.pdf_url,
  )?.pdf_url;
  const article: ArticleInsert = {
    doi: openalexArticle.doi,
    extOpenalexId: openalexArticle.id,
    title: openalexArticle.title,
    publicationDate: openalexArticle.publication_date,
    numCitations: openalexArticle.cited_by_count,
    citationNormalizedPercentile:
      openalexArticle.citation_normalized_percentile?.value,
    citedByPercentileYearMin: openalexArticle.cited_by_percentile_year?.min,
    fullPdfUrl,
    pdfDownloadStatus: "not_started",
    field: openalexArticle.primary_topic?.field.display_name,
    subfield: openalexArticle.primary_topic?.subfield.display_name,
    topic: openalexArticle.primary_topic?.display_name,
    journalId,
  };

  return { article };
}
