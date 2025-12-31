import { pgTable, serial, integer } from "drizzle-orm/pg-core";

export const dryadIndexingState = pgTable("dryad_indexing_state", {
  id: serial("id").primaryKey(),
  lastPageIndexed: integer("last_page_indexed"),
});

