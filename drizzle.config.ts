import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/repositories/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

