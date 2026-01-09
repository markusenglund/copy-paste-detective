import {
  pgTable,
  serial,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/pg-core";

export const journals = pgTable(
  "journals",
  {
    id: serial("id").primaryKey(),
    scimagoJournalRank: integer("scimago_journal_rank").notNull(),
    title: text("title").notNull(),
    issns: text("issns").array().notNull(),
    sjrScore: real("sjr_score"),
    avgCitations: real("avg_citations"),
    fields: text("fields").array().notNull(),
    publisher: text("publisher"),
  },
  (table) => [index("journals_issns_idx").using("gin", table.issns)],
);
