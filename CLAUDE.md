# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run detect` - Run the fraud detection command (uses tsx with dotenv config)
- `npm test` - Run tests using Jest with experimental VM modules
- `npm run lint` - Lint source code with ESLint
- `npm run typecheck` - Run TypeScript type checking without emitting files

### Database (Drizzle)
- `npm run migration:generate` - Generate new database migrations
- `npm run migration:run` - Run pending migrations
- `npm run migration:push` - Push schema changes directly to database

## Architecture

This is a fraud detection tool that analyzes Excel files for suspicious patterns. The main detection logic is in `src/commands/detect.ts` which implements a CLI interface using Commander.js.

### Core Components

**Detection Algorithm**: The fraud detection works by:
1. Reading Excel files using the `xlsx` library
2. Parsing numeric data from sheets and rounding floating point inaccuracies
3. Finding duplicate values and calculating entropy scores based on digit patterns
4. Detecting repeated sequences both horizontally and vertically in the data matrix
5. Scoring suspicious patterns using matrix-size-adjusted entropy calculations

**Key Functions**:
- `calculateNumberEntropy()` - Assigns entropy scores to numbers, with special handling for years (1900-2030)
- `findRepeatedSequences()` - Detects identical sequences across rows/columns
- `findDuplicateValues()` - Identifies frequently occurring numbers with high entropy
- `roundFloatingPointInaccuracies()` - Utility to clean floating point precision errors

**Suspicion Levels**: Results are categorized as None/Low/Medium/High with corresponding emoji indicators (❔/✅/🔴).

The tool processes sample Excel files from the `files/fraud/` directory and outputs tables showing the most suspicious patterns found.