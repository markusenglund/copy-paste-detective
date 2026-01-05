import * as csv from "@fast-csv/parse";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  insertJournals,
  getJournalCount,
  formatIssn,
} from "../repositories/journals/journalsRepository";
import { logger } from "../utils/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scimagoCsvPath = path.join(__dirname, "../scimago/sjr-2024.csv");

type ParsedJournal = {
  scimagoJournalRank: number;
  title: string;
  issns: string[];
  sjrScore: number | null;
  avgCitations: number | null;
  fields: string[];
  publisher: string | null;
};

async function importJournalsFromCsv(): Promise<void> {
  // Check if journals already exist
  const existingCount = await getJournalCount();
  if (existingCount > 0) {
    logger.info(
      `Database already contains ${existingCount} journals. Skipping import.`,
    );
    logger.info("To re-import, clear the journals table first.");
    process.exit(0);
  }

  logger.info(`Reading journals from ${scimagoCsvPath}...`);

  const journals = await new Promise<ParsedJournal[]>((resolve, reject) => {
    const results: ParsedJournal[] = [];

    const fixedCsv = fixMalformedQuotes(
      fs.readFileSync(scimagoCsvPath, "utf8"),
    );

    const stream = csv.parseString(fixedCsv, {
      headers: (headers) => {
        headers.map((header, i) => {
          if (headers.indexOf(header) !== i) {
            headers[i] = `${header}_${i}`;
          }
        });
        return headers;
      },
      discardUnmappedColumns: true,
      delimiter: ";",
      trim: true,
    });

    stream
      .on("error", (err) => reject(err))
      .on("data", (row: Record<string, string>) => {
        const rawIssns = row["Issn"]
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        const journal: ParsedJournal = {
          scimagoJournalRank: toInt(row["Rank"]),
          title: row["Title"],
          issns: rawIssns.map(formatIssn),
          sjrScore: toFloatEU(row["SJR"]) ?? null,
          avgCitations: toFloatEU(row["Citations / Doc. (2years)"]) ?? null,
          fields: toStringArray(row["Areas"]),
          publisher: row["Publisher"] || null,
        };
        results.push(journal);
      })
      .on("end", () => resolve(results));
  });

  logger.info(`Parsed ${journals.length} journals from CSV.`);

  // Insert in batches
  const batchSize = 500;
  let insertedCount = 0;

  for (let i = 0; i < journals.length; i += batchSize) {
    const batch = journals.slice(i, i + batchSize);
    await insertJournals(batch);
    insertedCount += batch.length;
    logger.info(`Inserted ${insertedCount}/${journals.length} journals...`);
  }

  logger.info(
    `Successfully imported ${insertedCount} journals into the database.`,
  );
}

function fixMalformedQuotes(input: string): string {
  let out = "";
  let inQuoted = false;
  const len = input.length;
  for (let i = 0; i < len; i++) {
    const ch = input[i];
    const next = i + 1 < len ? input[i + 1] : "";
    if (ch === '"') {
      if (!inQuoted) {
        inQuoted = true;
        out += ch;
      } else {
        if (next === '"') {
          out += '""';
          i += 1; // consume the next quote
        } else if (next === ";" || next === "\n" || next === "\r") {
          inQuoted = false;
          out += '"';
        } else {
          // interior unescaped quote inside a quoted field -> double it
          out += '""';
        }
      }
    } else {
      out += ch;
      if (ch === "\n" || ch === "\r") {
        inQuoted = false;
      }
    }
  }
  return out;
}

function toInt(value: string): number {
  const cleaned = String(value).trim().replaceAll(".", "").replaceAll(",", "");
  const n = Number.parseInt(cleaned, 10);
  if (Number.isNaN(n)) throw new Error(`Invalid integer: ${value}`);
  return n;
}

function toFloatEU(value: string): number | undefined {
  if (!value) {
    return;
  }
  // Convert European decimal comma to dot and drop thousands separators
  const normalized = value.replaceAll(".", "").replace(",", ".");
  const n = Number.parseFloat(normalized);
  if (Number.isNaN(n)) throw new Error(`Invalid number: ${value}`);
  return n;
}

function toStringArray(value: string): string[] {
  return value
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

importJournalsFromCsv()
  .then(() => {
    logger.info("Done!");
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`Import failed: ${error}`);
    process.exit(1);
  });
