import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const funders = pgTable("funders", {
  id: serial("id").primaryKey(),
  openalexExtId: text("openalex_ext_id").notNull().unique(),
  rorId: text("ror_id").unique().notNull(),
  displayName: text("display_name").notNull(),
});

export type FunderInsert = typeof funders.$inferInsert;
export type Funder = typeof funders.$inferSelect;
