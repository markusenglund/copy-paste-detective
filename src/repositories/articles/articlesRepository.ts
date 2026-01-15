import { db } from "../../db";
import { articles, ArticleInsert, Article } from "./schema";

export async function bulkUpsertArticles(
  data: ArticleInsert[],
): Promise<Article[]> {
  if (data.length === 0) return [];

  return db
    .insert(articles)
    .values(data)
    .onConflictDoUpdate({
      target: articles.extOpenalexId,
      set: {
        doi: articles.doi,
        title: articles.title,
        publicationDate: articles.publicationDate,
        numCitations: articles.numCitations,
        citationNormalizedPercentile: articles.citationNormalizedPercentile,
        citedByPercentileYearMin: articles.citedByPercentileYearMin,
        fullPdfUrl: articles.fullPdfUrl,
        field: articles.field,
        subfield: articles.subfield,
        topic: articles.topic,
        journalId: articles.journalId,
        updatedTimestamp: new Date(),
      },
    })
    .returning();
}
