`copy-paste-detective` detects duplicated data within Excel spreadsheets.

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

Add the database URL to your `.env` file:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_detective
```

Generate and run database migrations:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Migrating existing JSON data

If you have existing data in `data/dryad/datasets.json`, run the migration script:

```bash
npx tsx -r dotenv/config src/scripts/migrateFromJson.ts
```

### Docker commands reference

```bash
# Stop the database
docker stop science-detective-db

# Start the database (after stop)
docker start science-detective-db

# View logs
docker logs science-detective-db

# Remove the container (data persists in volume)
docker rm science-detective-db

# Remove the data volume (WARNING: deletes all data)
docker volume rm science-detective-pgdata
```

# Detection Strategies

There are currently three pluggable algorithms:

- `duplicateRows`: Finds duplicate rows across sheets
- `repeatedColumnSequences`: Identifies repeated sequences in columns
- `individualNumbers`: Detects suspicious individual number patterns

# Test Structure

Tests that use real datasets should be located in the benchmark-files repository, next to the file they are using in the test.
Unit tests for general functionality should be located next to the regular function file.
