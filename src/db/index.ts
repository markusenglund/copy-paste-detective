import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "../config/env";
import * as schema from "../repositories";

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
});

export const db = drizzle(pool, { schema });

export async function closeDb(): Promise<void> {
  await pool.end();
}
