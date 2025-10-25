import * as csv from "@fast-csv/parse";
import fs from "fs";
import { JournalSchema, type Journal } from "./scimagoJournalSchema";

const scimagoCsvPath = "sjr-2024.csv";

export async function loadScimagoIssnJournalMap(): Promise<
  Map<string, Journal>
> {
  const journals = await new Promise<Journal[]>((resolve, reject) => {
    const results: Journal[] = [];

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
        const journal = {
          scimagoJournalRank: toInt(row["Rank"]),
          title: row["Title"],
          issns: row["Issn"]
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
          scimagoJournalScore: toFloatEU(row["SJR"]),
          avgNumCitations: toFloatEU(row["Citations / Doc. (2years)"]),
        };
        const parsed = JournalSchema.parse(journal);
        results.push(parsed);
      })
      .on("end", () => resolve(results));
  });

  const journalByIssn = new Map<string, Journal>();
  for (const journal of journals) {
    for (const issn of journal.issns) {
      journalByIssn.set(issn, journal);
    }
  }
  return journalByIssn;
}

let journalsCachePromise: Promise<Map<string, Journal>> | null = null;

export async function getScimagoIssnJournalMap(): Promise<
  Map<string, Journal>
> {
  if (!journalsCachePromise) {
    journalsCachePromise = loadScimagoIssnJournalMap();
  }
  return journalsCachePromise;
}

export async function getJournalByIssn(
  issn: string,
): Promise<Journal | undefined> {
  const normalizedIssn = normalizeIssn(issn);
  const journalByIssn = await getScimagoIssnJournalMap();
  return journalByIssn.get(normalizedIssn);
}

function normalizeIssn(v: string): string {
  return v.replace(/[^0-9Xx]/g, "").toUpperCase();
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
