# PMC Integration - Full Plan

## Context

We want to index, download, and analyze Excel supplementary files from PubMed Central articles for copy-paste detection - the same thing we do with Dryad datasets.

### APIs

- **Europe PMC search** (`resultType=core`): PMCID, PMID, DOI, title, abstract, journal ISSN, citation count, publication date, `hasSuppl` flag. Supports `HAS_SUPPL:y OPEN_ACCESS:y` filter, `CITED desc` sorting, cursor-based pagination (~25 req/sec). No API key needed.
- **PMC S3 bucket** (`pmc-oa-opendata`): Public AWS S3 bucket. JSON metadata per article includes `media_urls` array with all supplementary files. Individual files downloadable via HTTPS. HEAD requests give file sizes. Also has `pdf_url` and `text_url` for full article text/PDF.
- **OpenAlex** (existing): Reuse existing code to enrich with citation data, journal SJR scores, authors, funders, institutions.

---

## Phase 1: Indexing (`pmc-index`)

Index articles from Europe PMC into the database. For each article: fetch S3 metadata, filter for Excel supplements, store metadata + file info.

### Database tables
- `pmc_datasets` - article metadata (mirrors `dryad_datasets`)
- `pmc_excel_files` - Excel supplementary file info (mirrors `dryad_excel_files`)
- `pmc_indexing_state` - cursor mark for resumable pagination

### Key behavior
- Paginate Europe PMC search sorted by `CITED desc`
- For each article, fetch S3 JSON to get `media_urls`
- Filter for `.xlsx`/`.xls` files, skip articles without any
- HEAD request each Excel file for size
- Upsert article + files into DB
- Save cursor mark after each page for resumability
- `--limit` flag to cap articles per run

---

## Phase 2: OpenAlex enrichment (`openalex-connect-pmc`)

Link PMC articles to OpenAlex for citation scores and journal data.

### Database changes
- Add `pmcDatasetId` FK column to existing `articles` table (alongside `dryadDatasetId`)
- Add index on `pmcDatasetId`

### Key behavior
- Model on existing `openalexConnectDatasets.ts`
- Create `getArticleFromPmcDataset()` - lookup by DOI (primary, PMC articles have DOIs), fallback to title
- Reuse `convertOpenalexArticle()`, author/funder/institution upsert logic
- Same citation score formula: `(sjrScore + numCitations) * LOG(10 + sjrScore) / (1 + yearsSincePublication)`

---

## Phase 3: Download (`pmc-download`)

Download Excel files and PDFs for highest-impact articles.

### Key behavior
- Query `pmc_datasets` joined with `articles` + `journals` for citation score ranking
- Filter: `downloadStatus = 'not_started'`, has Excel files under 10MB
- For each article:
  - Download Excel files directly from S3 URLs (already stored in `pmc_excel_files.s3Url`)
  - Download PDF from S3 `pdf_url`
  - Download full text from S3 `text_url`
  - Store in `storage/pmc/{pmcid}/`
  - Update download status
- Support `--pmcid` flag for single-article download
- Support `--limit` flag

---

## Phase 4: Detection (`pmc-detect`, `pmc-detect-all`)

Run copy-paste detection on downloaded PMC Excel files.

### Key behavior
- Create `loadExcelFileFromPmcDataset()` - analogous to `loadExcelFileFromDryadIndex()`
  - Loads Excel from `storage/pmc/{pmcid}/`
  - Returns `ExcelFileData` with `pmcDatasetId` / `pmcExcelFileId` fields
- Add optional `pmcDatasetId` / `pmcExcelFileId` fields to `ExcelFileData` type
- Add PMC columns to `ai_review_results` table (nullable `pmcDatasetId`, `pmcExcelFileId`)
- Reuse `analyzeDataset()` and all existing detection strategies
- Meta-analysis check using title + abstract (same as Dryad)

---

## Phase 5: Dashboard unification

Unify Dryad and PMC data in the web UI.

### Options (decide later)
- **Option A**: Source-agnostic abstraction - create a `datasets` view/table that unions both sources, with a `source` discriminator. Refactor dashboard queries to use the view.
- **Option B**: Parallel queries - keep separate tables, UNION results in dashboard queries. Less refactoring but more complex queries.
- **Option C**: Migrate to a single `datasets` table with nullable source-specific columns. Most unified but largest migration.

### What needs to change
- `getDashboardArticles()` - needs to include PMC articles
- `getDatasetDetails()` - needs PMC variant
- `datasetDetailsService.ts` - currently hardcoded to Dryad
- Frontend routes and components
- Statistics/reporting

---

## Shared infrastructure (existing, reused across phases)

- `src/openalex/` - OpenAlex API client and article extraction
- `src/repositories/articles/` - articles table linking to OpenAlex data
- `src/repositories/journals/` - journal SJR scores (linked by ISSN)
- `src/detection/` - all detection strategies
- `src/db/shared/enums.ts` - `downloadStatusEnum`, `analysisStatusEnum`
- `src/utils/paths/storagePaths.ts` - already has `pmc` / `pmcArticle` paths
