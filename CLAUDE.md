# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `npm run detect` - Run the fraud detection command (uses tsx with dotenv config)
- `npm test` - Run tests using Jest with experimental VM modules
- `npm run lint` - Lint source code with ESLint
- `npm run typecheck` - Run TypeScript type checking without emitting files

## Architecture

This is a fraud detection tool that analyzes Excel files for suspicious patterns. The tool uses a CLI interface built with Commander.js and currently analyzes hardcoded files.

### File Structure

**Commands**: `src/commands/detect.ts` - CLI interface with `excel` subcommand
**Detection**: `src/detection/index.ts` - Core fraud detection algorithms
**Types**: `src/types/index.ts` - TypeScript definitions for detection results
**Utils**:

- `src/utils/entropy.ts` - Entropy calculation functions
- `src/utils/excel.ts` - Excel parsing and matrix operations
- `src/utils/output.ts` - Result formatting with suspicion indicators
- `src/utils/sequence.ts` - Sequence regularity analysis
- `src/utils/roundFloatingPointInaccuracies.ts` - Floating point cleanup

### Detection Algorithm

The fraud detection works by:

1. Reading Excel files using the `xlsx` library (limited to first 5000 rows per sheet)
2. Parsing numeric data from sheets and rounding floating point inaccuracies
3. Finding duplicate values and calculating entropy scores based on digit patterns
4. Detecting repeated sequences both horizontally and vertically in the data matrix
5. Scoring suspicious patterns using matrix-size-adjusted entropy calculations

### Key Functions

**Entropy Analysis**:

- `calculateNumberEntropy()` - Assigns entropy scores with special handling for years (1900-2030), tests denominators [2,3,7,9,11,13,17,19,23] for common fractions, returns lowest entropy of numerators
- Uses entropy threshold of 5000 for high-suspicion duplicates
- Filters sequences with minimum entropy score of 10

**Pattern Detection**:

- `findRepeatedSequences()` - Detects identical sequences in both horizontal and vertical directions
- `findDuplicateValues()` - Identifies frequently occurring numbers with entropy analysis
- `deduplicateSortedSequences()` - Removes duplicate sequence matches

**Utilities**:

- `roundFloatingPointInaccuracies()` - Cleans floating point precision errors
- Sequence regularity analysis to adjust suspicion levels
- Matrix-size-adjusted entropy normalization

### Current Operation

**Input**: Currently hardcoded

**Output**: Three tables showing:

1. Top entropy duplicate numbers
2. Top occurrence high entropy duplicates
3. Repeated sequences

**Suspicion Levels**: Results are categorized as None/Low/Medium/High with corresponding emoji indicators (❔/✅/🔴).

### Testing

**Current Coverage**: Only `src/utils/entropy.ts` has comprehensive tests (6 test cases covering years, decimals, fractions, edge cases)
**Test Framework**: Jest with ts-jest ESM preset and experimental VM modules

## Project Goals

### Large-Scale Analysis

- **Automated Processing**: Loop through thousands of Excel files available in Datadryad automatically and store results in a database
- **Result Ranking**: Sort results by suspicion level to identify the most suspicious files for manual investigation
- **Database Integration**: Store analysis results for efficient querying and comparison

### Fraud Detection Improvement

- **Real-World Testing**: Iterate on fraud detection functionality by running it on large datasets of real Excel files
- **Benchmark Collection**: Build a curated collection of Excel files (both known fraudulent and normal data) for testing
- **Performance Evaluation**: Develop benchmark scripts to evaluate false positive and false negative rates
- **Comprehensive Testing**: Add automated tests for all special cases including dates, formulas, and edge cases

### Investigation Automation

- **AI-Assisted Analysis**: Integrate Google Gemini to automate portions of the manual investigation process
- **Pattern Recognition**: Use AI to identify additional suspicious patterns beyond statistical analysis
