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

- Create an `.env` file and add the Gemini and Dryad environment variables specified in `.env.dist`
- Run `npm i` to install dependencies

# Detection Strategies

There are currently three pluggable algorithms:

- `duplicateRows`: Finds duplicate rows across sheets
- `repeatedColumnSequences`: Identifies repeated sequences in columns
- `individualNumbers`: Detects suspicious individual number patterns

# Test Structure

Tests that use real datasets should be located in the benchmark-files repository, next to the file they are using in the test.
Unit tests for general functionality should be located next to the regular function file.
