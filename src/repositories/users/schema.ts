import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const roleEnum = ["admin", "editor", "viewer"] as const;
export type Role = (typeof roleEnum)[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: roleEnum }).notNull().default("viewer"),
  requiresPasswordChange: boolean("requires_password_change")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
