import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { aiReviewResults } from "../aiReviewResults/schema";
import { articles } from "../articles/schema";

export const aiPdfReviewResults = pgTable(
  "ai_pdf_review_results",
  {
    id: serial("id").primaryKey(),
    aiReviewResultId: integer("ai_review_result_id")
      .notNull()
      .references(() => aiReviewResults.id, { onDelete: "cascade" }),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id),
    prompt: text("prompt").notNull(),
    model: text("model").notNull(),
    impactScore: integer("impact_score").notNull(),
    response: text("response").notNull(),
    hash: text("hash").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    aiReviewIdx: index("idx_ai_pdf_review_results_ai_review").on(
      table.aiReviewResultId,
    ),
    articleIdx: index("idx_ai_pdf_review_results_article").on(table.articleId),
    hashIdx: index("idx_ai_pdf_review_results_hash").on(table.hash),
    hashUnique: unique("ai_pdf_review_results_hash_unique").on(table.hash),
  }),
);
