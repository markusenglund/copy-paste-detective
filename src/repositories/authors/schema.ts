import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  orcid: text("orcid").unique().notNull(),
  extOpenalexId: text("ext_openalex_id").notNull().unique(),
  createdTimestamp: timestamp("created_timestamp").notNull().defaultNow(),
  updatedTimestamp: timestamp("updated_timestamp").notNull().defaultNow(),
});
