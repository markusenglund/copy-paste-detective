import { Command } from "@commander-js/extra-typings";
import {
  DuplicateValue,
  type RepeatedSequence,
  type DuplicateRow
} from "src/types";
import { Sheet } from "src/entities/Sheet";
import {
  deduplicateSortedSequences,
  findRepeatedSequences,
  findDuplicateValues,
  findDuplicateRows
} from "src/detection";
import {
  formatSequencesForDisplay,
  formatDuplicatesByEntropyForDisplay,
  formatDuplicatesByOccurrenceForDisplay,
  formatDuplicateRowsForDisplay
} from "src/utils/output";
import { GeminiService } from "src/ai/geminiService";
import { readFileSync } from "fs";
import xlsx from "xlsx";
const program = new Command();

program.name("detect").description("First command").version("0.1.0");

program
  .command("excel")
  .description("Investigate an excel file")
  .action(async () => {
    console.time("Time elapsed");
    console.time("Read Excel file in");
    // const workbook = xlsx.readFile("files/fraud/pnas.2300363120.sd01.xlsx");
    // const workbook = xlsx.readFile(
    //   "files/fraud/Dumicola+familiarity+wide.xlsx"
    // );
    const excelDataFolder =
      "benchmark-files/doi_10_5061_dryad_ksn02v7ft__v20250416";
    const excelFileName = "Dryad_dataset.xlsx";
    const paperName =
      "A semi-controlled feeding study involving rats fed to a red-tailed hawk (Buteo jamaicensis) and Eurasian eagle owl (Bubo bubo)";
    const workbook = xlsx.readFile(
      // "files/non-fraud/doi_10_5061_dryad_stqjq2cdp__v20250418/2025-3-24-common_garden.xlsx",
      `${excelDataFolder}/${excelFileName}`,
      { sheetRows: 5000 } // Only read the first 5000 rows from each sheet
    );
    console.timeEnd("Read Excel file in");

    const sheetNames = workbook.SheetNames;
    console.log(`Found ${sheetNames.length} sheets: ${sheetNames.join(", ")}`);

    // Use Gemini to analyze column structure for the first sheet
    const firstSheetName = sheetNames[0];
    const firstWorkbookSheet = workbook.Sheets[firstSheetName];
    const firstMatrix: unknown[][] = xlsx.utils.sheet_to_json(
      firstWorkbookSheet,
      {
        raw: true,
        header: 1
      }
    );

    console.time("Gemini API call");
    const gemini = new GeminiService();

    // Extract column names and sample data for Gemini
    const columnNames = (firstMatrix[0] || []).map(cell => String(cell || ""));
    const sampleData = firstMatrix
      .slice(1, 3)
      .map(row => row.map(cell => String(cell || "")));

    let columnCategorization = null;
    try {
      // Read README.md from the excel data folder
      const readmePath = `${excelDataFolder}/README.md`;
      const dataDescription = readFileSync(readmePath, "utf-8");

      columnCategorization = await gemini.categorizeColumns({
        paperName,
        excelFileName,
        dataDescription,
        columnNames,
        columnData: sampleData
      });

      console.timeEnd("Gemini API call");
      console.log("\n🤖 Gemini Analysis Results:");
      console.log(
        "✅ Columns expected to have UNIQUE values:",
        columnCategorization.unique
      );
      console.log(
        "🔄 Columns expected to have SHARED values:",
        columnCategorization.shared
      );
      console.log(
        "\nNote: Fraud detection will focus on duplicate analysis in 'unique' columns\n"
      );
    } catch (error) {
      console.timeEnd("Gemini API call");
      console.warn(
        "⚠️ Gemini API failed, proceeding with standard analysis:",
        error
      );
    }

    const repeatedSequences: (RepeatedSequence & { sheetName: string })[] = [];
    const topEntropyDuplicateNumbers: DuplicateValue[] = [];
    const topOccurenceHighEntropyDuplicateNumbers: DuplicateValue[] = [];
    const allDuplicateRows: DuplicateRow[] = [];
    for (const sheetName of sheetNames) {
      const workbookSheet = workbook.Sheets[sheetName];
      const sheet = new Sheet(workbookSheet, sheetName);

      console.log(
        `[${sheetName}] Found ${sheet.numNumericCells} numeric values`
      );

      const {
        duplicateValuesSortedByEntropy,
        duplicatedValuesAboveThresholdSortedByOccurences
      } = findDuplicateValues(sheet);

      topEntropyDuplicateNumbers.push(
        ...duplicateValuesSortedByEntropy.slice(0, 5)
      );

      topOccurenceHighEntropyDuplicateNumbers.push(
        ...duplicatedValuesAboveThresholdSortedByOccurences.slice(0, 5)
      );

      // Find duplicate rows if Gemini categorization is available
      if (columnCategorization) {
        console.time("Duplicate rows");
        const { duplicateRows } = findDuplicateRows(
          sheet,
          columnCategorization
        );
        console.timeEnd("Duplicate rows");

        console.log(
          `[${sheetName}] ${duplicateRows.length} duplicate row pairs found`
        );

        allDuplicateRows.push(...duplicateRows);
      }
      console.time("Vertical sequences");
      const verticalSequences = findRepeatedSequences(
        sheet.invertedEnhancedMatrix,
        {
          sheetName,
          isInverted: true,
          numberCount: sheet.numNumericCells
        }
      );
      console.timeEnd("Vertical sequences");
      console.time("Horizontal sequences");
      const horizontalSequences = findRepeatedSequences(sheet.enhancedMatrix, {
        sheetName,
        isInverted: false,
        numberCount: sheet.numNumericCells
      });
      console.timeEnd("Horizontal sequences");

      console.log(
        `[${sheetName}] ${verticalSequences.length} vertical sequences found, ${horizontalSequences.length} horizontal sequences found`
      );

      repeatedSequences.push(...verticalSequences);
      repeatedSequences.push(...horizontalSequences);
    }
    const sortedSequences = repeatedSequences
      .toSorted((a, b) => {
        return (
          (b.matrixSizeAdjustedEntropyScore || 0) -
          (a.matrixSizeAdjustedEntropyScore || 0)
        ); // Use || 0 to handle NaN values. TODO: Fix this in the findRepeatedSequences function
      })
      .filter(sequence => sequence.matrixSizeAdjustedEntropyScore > 1);

    const deduplicatedSortedSequences =
      deduplicateSortedSequences(sortedSequences);

    const humanReadableSequences = formatSequencesForDisplay(
      deduplicatedSortedSequences.slice(0, 20)
    );

    const humanReadableTopEntropyDuplicateNumbers =
      formatDuplicatesByEntropyForDisplay(topEntropyDuplicateNumbers);

    const humanReadableTopOccurenceNumbers =
      formatDuplicatesByOccurrenceForDisplay(
        topOccurenceHighEntropyDuplicateNumbers
      );

    // Sort and format duplicate rows
    const sortedDuplicateRows = allDuplicateRows
      .toSorted((a, b) => b.rowEntropyScore - a.rowEntropyScore)
      .slice(0, 20); // Show top 20 most suspicious pairs

    const humanReadableDuplicateRows =
      formatDuplicateRowsForDisplay(sortedDuplicateRows);

    console.log(`Top entropy duplicate numbers:`);
    console.table(humanReadableTopEntropyDuplicateNumbers);
    console.log(`Top occurance numbers with entropy>5000:`);
    console.table(humanReadableTopOccurenceNumbers);
    console.log(`Repeated sequences:`);
    console.table(humanReadableSequences);

    if (columnCategorization && humanReadableDuplicateRows.length > 0) {
      console.log(
        `\nDuplicate rows (${allDuplicateRows.length} total, showing top ${humanReadableDuplicateRows.length}):`
      );
      console.table(humanReadableDuplicateRows);
    } else if (columnCategorization) {
      console.log(`\n✅ No duplicate rows found in unique columns!`);
    } else {
      console.log(
        `\n⚠️ Duplicate row analysis skipped (Gemini API unavailable)`
      );
    }

    console.timeEnd("Time elapsed");
  });

program.parse();
