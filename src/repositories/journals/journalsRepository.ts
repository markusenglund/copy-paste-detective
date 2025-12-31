import { sql } from "drizzle-orm";
import { db } from "../../db";
import { journals } from "./schema";

// Re-export types for convenience
export type JournalRow = typeof journals.$inferSelect;

/**
 * Formats an ISSN with a hyphen after the 4th character.
 * Strips all non-alphanumeric characters first.
 * Example: "12622966" → "1262-2966"
 * Example: "1262-2966" → "1262-2966"
 */
export function formatIssn(v: string): string {
  const normalized = v.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (normalized.length !== 8) {
    return normalized; // Return as-is if not a valid 8-character ISSN
  }
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

export async function getJournalByIssn(
  issn: string,
): Promise<JournalRow | undefined> {
  const result = await db
    .select()
    .from(journals)
    .where(sql`${journals.issns} @> ARRAY[${issn}]::text[]`)
    .limit(1);
  return result[0];
}

export async function getAllJournals(): Promise<JournalRow[]> {
  return db.select().from(journals);
}

/**
 * Returns a Map of all journals keyed by their ISSNs.
 * Since journals can have multiple ISSNs, the same journal may appear
 * under multiple keys.
 */
export async function getJournalsByIssnMap(): Promise<Map<string, JournalRow>> {
  const allJournals = await getAllJournals();
  const journalByIssn = new Map<string, JournalRow>();
  for (const journal of allJournals) {
    for (const issn of journal.issns) {
      journalByIssn.set(issn, journal);
    }
  }
  return journalByIssn;
}

export async function insertJournal(data: {
  scimagoJournalRank: number;
  title: string;
  issns: string[];
  sjrScore?: number | null;
  avgCitations?: number | null;
  fields: string[];
  publisher?: string | null;
}): Promise<JournalRow> {
  const [inserted] = await db.insert(journals).values(data).returning();
  return inserted;
}

export async function insertJournals(
  data: {
    scimagoJournalRank: number;
    title: string;
    issns: string[];
    sjrScore?: number | null;
    avgCitations?: number | null;
    fields: string[];
    publisher?: string | null;
  }[],
): Promise<JournalRow[]> {
  if (data.length === 0) return [];
  return db.insert(journals).values(data).returning();
}

export async function getJournalCount(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journals);
  return result[0]?.count ?? 0;
}
