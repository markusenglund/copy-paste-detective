import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../repositories";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export async function closeDb(): Promise<void> {
  await pool.end();
}
