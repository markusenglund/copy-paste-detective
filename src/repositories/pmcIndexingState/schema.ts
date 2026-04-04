import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const pmcIndexingState = pgTable("pmc_indexing_state", {
  id: serial("id").primaryKey(),
  lastCursorMark: text("last_cursor_mark"),
  totalIndexed: integer("total_indexed").notNull().default(0),
});
