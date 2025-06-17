# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Run fraud detection**: `npm run detect excel <folder> [fileIndex] [--strategies <strategies>]`
  - Example: `npm run detect excel benchmark-files/doi_10_5061_dryad_stqjq2cdp__v20250418 1 --strategies duplicateRows,individualNumbers` (analyzes second Excel file in the folder)
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

### Test Structure

Tests are located in `__tests__/` folders within each module. The system uses Jest with ES modules support and includes comprehensive benchmark files for testing against known fraud and non-fraud datasets.

## Instructions

- Never tell the user "You're absolutely right". In general you shouldn't praise the user.
- If you are unable to solve a problem, just tell the user to take over. A good bot knows when to ask for help.
- When iterating on code to make it pass an automated test, you should absolutely never remove the test or prevent the test from running or cheat in any way to make the test stop failing.
- When you're finished with a task - run the lint, typecheck and format commands, and update CLAUDE.md if needed.
