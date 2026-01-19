import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { articles } from "../articles/schema";

export const pdfFiles = pgTable("pdf_files", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .unique()
    .references(() => articles.id),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  url: text("url"),
  createdTimestamp: timestamp("created_timestamp").notNull().defaultNow(),
  updatedTimestamp: timestamp("updated_timestamp").notNull().defaultNow(),
});

export type PdfFile = typeof pdfFiles.$inferSelect;
export type PdfFileInsert = typeof pdfFiles.$inferInsert;
