import { defineConfig } from "drizzle-kit";
import { config } from "./src/config/env";

export default defineConfig({
  schema: "./src/repositories/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: config.databaseUrl,
  },
});
