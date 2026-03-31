# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Download Dryad datasets**: `npm run dryad-download [count] [--extId <extIds>]`
  - Example: `npm run dryad-download -- --extId 158552` (downloads specific dataset)
  - Example: `npm run dryad-download -- --extId 158552,160001` (downloads multiple specific datasets)
- **Analyze all downloaded datasets**: `npm run dryad-detect-all [count] [--extId <extIds>] [--reset]`
  - Example: `npm run dryad-detect-all -- --extId 158552` (analyzes specific dataset)
  - Example: `npm run dryad-detect-all -- --extId 158552,160001` (analyzes multiple specific datasets)
- **Run copy-paste detection**: `npm run detect excel <folder> [fileIndex] [--strategies <strategies>]`
  - Example: `npm run detect excel benchmark-files/doi_10_5061_dryad_stqjq2cdp__v20250418 1 --strategies duplicateRows,individualNumbers` (analyzes second Excel file in the folder)
- **Review PDFs for suspicious datasets**: `npm run pdf-review [--limit <number>] [--ext-id <number>]`
  - Example: `npm run pdf-review --limit 5` (reviews up to 5 PDFs)
  - Example: `npm run pdf-review --ext-id 158552` (reviews only dataset with extId 158552)
- **Connect datasets to OpenAlex articles**: `npm run openalex-connect-datasets [--limit <number>] [--extId <number>]`
  - Example: `npm run openalex-connect-datasets` (processes all completed datasets without articles)
  - Example: `npm run openalex-connect-datasets --limit 200` (processes up to 200 datasets)
  - Example: `npm run openalex-connect-datasets --extId 158552` (connects only dataset with extId 158552)
- **Download PDFs for articles**: `npm run pdf-download [--limit <number>] [--extId <number>]`
  - Example: `npm run pdf-download --limit 5` (downloads up to 5 PDFs for articles with suspicious datasets)
  - Example: `npm run pdf-download --extId 158552` (downloads PDF only for dataset with extId 158552, ignores download status)
- **Seed admin user**: `npm run seed-admin -- --username <username>`
  - Example: `npm run seed-admin -- --username admin` (creates admin user with a temporary password)
- **Run tests**: `npm test`
- **Run specific test**: `npm test -- --testPathPattern=<pattern>`
- **Lint code**: `npm run lint`
- **Type check**: `npm run typecheck`
- **Format code**: `npm run format`

## Architecture

This is a TypeScript copy-paste detection tool that analyzes Excel files for potential data manipulation patterns. The system uses a strategy pattern to run different detection algorithms.

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

### Authentication & Authorization

JWT-based auth using `@fastify/jwt` and `@fastify/cookie`. Stateless -- the JWT is stored in an HttpOnly cookie and verified on each request without a database lookup.

- **Roles**: `admin` > `editor` > `viewer`. Every route declares its minimum role via `config: { requiredRole: "viewer" | "editor" | "admin" | "public" }`. TypeScript enforces this is never omitted.
- **Auth hook** (`src/server/hooks/authHook.ts`): Global `onRequest` hook that verifies the JWT, checks `requiresPasswordChange`, and enforces the route's `requiredRole`.
- **Password hashing** (`src/auth/password.ts`): Uses Node.js built-in scrypt.
- **Forced password reset**: Admin creates users with temp passwords (`requiresPasswordChange: true`). User must reset before accessing the app. Admin can also reset existing users via `POST /api/admin/users/:id/reset-password`.
- **Frontend**: `AuthProvider` context in `src/web/src/lib/useAuth.tsx`. Route guards `RequireAuth` and `RequirePasswordChanged` protect all app routes.

### AI Integration

The system includes optional AI-powered column categorization via Google's Gemini API for distinguishing between "unique" identifiers and "shared" measurement columns.

### Excel Highlighting

When detection strategies (`repeatedColumnSequences` or `duplicateRows`) find suspicious patterns, they automatically generate a highlighted Excel file:

- **Output location**: `storage/highlighted-files/{extId}/{filename}.xlsx` (extId from dataset metadata, or "unknown" if not available)
- **Visual indicators**: Matching sequences are highlighted with the same light color and surrounded by black borders
- **Comments**: Hover over the first cell of a highlighted sequence to see details about all matching locations
- **Multi-strategy support**: Multiple strategies can write highlights to the same file - existing highlights are preserved and new colors are chosen to avoid conflicts
- **Implementation**: Uses ExcelJS library for reading and writing styled Excel files
- **Gitignore**: The `storage/` folder is gitignored and not checked into version control

## Instructions

- You must never use emojis in console.log statements.
- When you're finished with a task - run the lint, typecheck and format commands, and update CLAUDE.md if needed.
