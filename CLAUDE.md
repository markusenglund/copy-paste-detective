# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Run fraud detection**: `npm run detect excel <folder> [fileIndex] [--strategies <strategies>]`
  - Example: `npm run detect excel benchmark-files/doi_10_5061_dryad_stqjq2cdp__v20250418 1 --strategies duplicateRows,individualNumbers` (analyzes second Excel file in the folder)
- **Review PDFs for suspicious datasets**: `npm run pdf-review [--limit <number>] [--ext-id <number>]`
  - Example: `npm run pdf-review --limit 5` (reviews up to 5 PDFs)
  - Example: `npm run pdf-review --ext-id 158552` (reviews only dataset with extId 158552)
- **Connect datasets to OpenAlex articles**: `npm run openalex-connect-datasets [--extId <number>]`
  - Example: `npm run openalex-connect-datasets` (processes all completed datasets without articles)
  - Example: `npm run openalex-connect-datasets --extId 158552` (connects only dataset with extId 158552)
- **Download PDFs for articles**: `npm run pdf-download [--limit <number>] [--extId <number>]`
  - Example: `npm run pdf-download --limit 5` (downloads up to 5 PDFs for articles with suspicious datasets)
  - Example: `npm run pdf-download --extId 158552` (downloads PDF only for dataset with extId 158552, ignores download status)
- **Run tests**: `npm test`
- **Run specific test**: `npm test -- --testPathPattern=<pattern>`
- **Lint code**: `npm run lint`
- **Type check**: `npm run typecheck`
- **Format code**: `npm run format`

## Architecture

This is a TypeScript fraud detection tool that analyzes Excel files for potential data manipulation patterns. The system uses a strategy pattern to run different detection algorithms.

### Core Components

1. **ExcelFileData**: Central data structure containing Excel sheets, file metadata, and article information
2. **Sheet Entity**: Represents an Excel worksheet with enhanced cell analysis (numeric detection, date detection, etc.)
3. **Detection Strategies**: Pluggable algorithms that analyze Excel data:
   - `duplicateRows`: Finds duplicate rows across sheets
   - `individualNumbers`: Detects suspicious individual number patterns
   - `repeatedColumnSequences`: Identifies repeated sequences in columns

### Key Architecture Patterns

- **Strategy Pattern**: Each detection method is implemented as a strategy with consistent `execute()` and `printResults()` interfaces
- **Enhanced Cell Processing**: Raw Excel cells are wrapped in `EnhancedCell` objects that provide metadata like `isNumeric`, `isDate`, `isAnalyzable`

### Data Flow

1. CLI command loads Excel file using `loadExcelFileFromFolder()`
2. Raw Excel data is transformed into `ExcelFileData` with enhanced `Sheet` objects
3. `runStrategies()` executes selected detection strategies in order
4. Each strategy analyzes the data and prints results
5. Some strategies depend on results from previous strategies (e.g., `individualNumbers` uses `duplicateRows` results)

### AI Integration

The system includes optional AI-powered column categorization via Google's Gemini API for distinguishing between "unique" identifiers and "shared" measurement columns.

## Instructions

- You must never use emojis in console.log statements.
- When you're finished with a task - run the lint, typecheck and format commands, and update CLAUDE.md if needed.
