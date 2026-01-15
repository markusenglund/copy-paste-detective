import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const institutions = pgTable("institutions", {
  id: serial("id").primaryKey(),
  openalexExtId: text("openalex_ext_id").unique(),
  rorId: text("ror_id").unique().notNull(),
  displayName: text("display_name"),
  countryCode: text("country_code"),
  createdTimestamp: timestamp("created_timestamp").notNull().defaultNow(),
  updatedTimestamp: timestamp("updated_timestamp").notNull().defaultNow(),
});

export type InstitutionInsert = typeof institutions.$inferInsert;
export type Institution = typeof institutions.$inferSelect;
