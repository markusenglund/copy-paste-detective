`copy-paste-detective` detects duplicated data within Excel spreadsheets.

This repository is source-available, not open-source. The code is
public so that funders, collaborators, and the research integrity
community can follow development and learn from the approach.

# Commands

- `npm run detect excel <folder> [fileIndex]` - Detect anomalous data from Excel sheet stored on the file-system.
  - Example: `npm run detect excel benchmark-files/doi_10_5061_dryad_stqjq2cdp__v20250418 1` (analyzes second Excel file in the folder)
  - Example: `npm run detect excel benchmark-files/doi_10_5061_dryad_stqjq2cdp__v20250418 1 -- --strategies duplicateRows,individualNumbers` (runs only some strategies)

### Dryad integration

- `npm run dryad-index` - Index all datasets in Dryad with at least one Excel sheet that fulfils the inclusion criteria (duration: ~1 day).
- `npm run dryad-download` - Download Excel files of previously indexed Dryad datasets.
- `npm run dryad-detect` - Detect anomalous data from a single downloaded Dryad dataset
- `npm run dryad-detect-all` - Run the detection on all downloaded Dryad datasets
- `npm run dryad-report` - Get overview of all completed analyses of Dryad datasets, ordered by level of suspicion.

### Testing

- `npm run test` - Run automated Jest tests
- `npm run test-ai` - Check that the currently selected model returns the right output on the column-categorization prompt.

# Setup

## Prerequisites

- Node.js (v18+)
- Docker

## Installation

1. Run `npm i` to install dependencies

2. Create an `.env` file and add the environment variables specified in `.env.dist`

## Database Setup (PostgreSQL with Docker)

Start a PostgreSQL container:

```bash
docker run -d \
  --name science-detective-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=science_detective \
  -p 5432:5432 \
  -v science-detective-pgdata:/var/lib/postgresql/data \
  postgres:16
```

The app constructs the database connection URL from `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`, and `POSTGRES_PORT` (all have sensible defaults matching the Docker command above, so no extra `.env` entries are needed for local dev).

Generate and run database migrations:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Migrating existing JSON data

If you have existing data in `storage/json-store/datasets.json`, run the migration script:

```bash
npx tsx -r dotenv/config src/scripts/migrateFromJson.ts
```

# Detection Strategies

There are currently three pluggable algorithms:

- `duplicateRows`: Finds duplicate rows across sheets
- `repeatedColumnSequences`: Identifies repeated sequences in columns
- `individualNumbers`: Detects suspicious individual number patterns

# Test Structure

Tests that use real datasets should be located in the benchmark-files repository, next to the file they are using in the test.
Unit tests for general functionality should be located next to the regular function file.
