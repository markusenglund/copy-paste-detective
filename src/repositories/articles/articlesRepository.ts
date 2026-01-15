import { db } from "../../db";
import {
  articles,
  articleAuthors,
  articleFunders,
  ArticleInsert,
  ArticleAuthorInsert,
  ArticleFunderInsert,
  Article,
} from "./schema";

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

export type ArticleAuthor = typeof articleAuthors.$inferSelect;

export async function bulkUpsertArticleAuthors(
  data: ArticleAuthorInsert[],
): Promise<ArticleAuthor[]> {
  if (data.length === 0) return [];

  return db
    .insert(articleAuthors)
    .values(data)
    .onConflictDoUpdate({
      target: [articleAuthors.articleId, articleAuthors.authorId],
      set: {
        authorPosition: articleAuthors.authorPosition,
        institutionId: articleAuthors.institutionId,
        updatedTimestamp: new Date(),
      },
    })
    .returning();
}

export type ArticleFunder = typeof articleFunders.$inferSelect;

export async function bulkInsertArticleFunders(
  data: ArticleFunderInsert[],
): Promise<ArticleFunder[]> {
  if (data.length === 0) return [];

  return db
    .insert(articleFunders)
    .values(data)
    .onConflictDoNothing({
      target: [articleFunders.articleId, articleFunders.funderId],
    })
    .returning();
}
