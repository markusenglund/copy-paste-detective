import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { pdfFiles } from "./schema";

// Re-export types for convenience
export type PdfFileRow = typeof pdfFiles.$inferSelect;

export async function upsertPdfFile(data: {
  articleId: number;
  filename: string;
  size: number;
  url?: string | null;
}): Promise<PdfFileRow> {
  const [result] = await db
    .insert(pdfFiles)
    .values({
      articleId: data.articleId,
      filename: data.filename,
      size: data.size,
      url: data.url ?? null,
    })
    .onConflictDoUpdate({
      target: pdfFiles.articleId,
      set: {
        filename: data.filename,
        size: data.size,
        url: data.url ?? null,
        updatedTimestamp: sql`NOW()`,
      },
    })
    .returning();
  return result;
}

export async function getPdfFileByArticleId(
  articleId: number,
): Promise<PdfFileRow | undefined> {
  const [result] = await db
    .select()
    .from(pdfFiles)
    .where(eq(pdfFiles.articleId, articleId));
  return result;
}

export async function getPdfFilesByArticleIds(
  articleIds: number[],
): Promise<PdfFileRow[]> {
  if (articleIds.length === 0) return [];
  return db
    .select()
    .from(pdfFiles)
    .where(inArray(pdfFiles.articleId, articleIds));
}
