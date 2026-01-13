import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  orcid: text("orcid").unique().notNull(),
  extOpenalexId: text("ext_openalex_id").notNull().unique(),
});
