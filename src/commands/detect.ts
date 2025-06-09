import { Command } from "@commander-js/extra-typings";
import { DuplicateValue, type RepeatedSequence } from "src/types";
import { Sheet } from "src/entities/Sheet";
import {
  deduplicateSortedSequences,
  findRepeatedSequences,
  findDuplicateValues
} from "src/detection";
import {
  formatSequencesForDisplay,
  formatDuplicatesByEntropyForDisplay,
  formatDuplicatesByOccurrenceForDisplay
} from "src/utils/output";
// import { GeminiService } from "src/ai/geminiService";
// import { readFileSync } from "fs";
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
      "files/non-fraud/doi_10_5061_dryad_stqjq2cdp__v20250418";
    const excelFileName = "2025-3-24-Field_survey.xlsx";
    // const paperName =
    //   "Dual drivers of plant invasions: Enemy release and enhanced mutualisms";
    const workbook = xlsx.readFile(
      // "files/non-fraud/doi_10_5061_dryad_stqjq2cdp__v20250418/2025-3-24-common_garden.xlsx",
      `${excelDataFolder}/${excelFileName}`,
      { sheetRows: 5000 } // Only read the first 5000 rows from each sheet
    );
    console.timeEnd("Read Excel file in");

    const sheetNames = workbook.SheetNames;
    console.log(`Found ${sheetNames.length} sheets: ${sheetNames.join(", ")}`);

    // Use Gemini to analyze column structure for the first sheet
    // const firstSheetName = sheetNames[0];
    // const firstWorkbookSheet = workbook.Sheets[firstSheetName];
    // const firstMatrix: unknown[][] = xlsx.utils.sheet_to_json(
    //   firstWorkbookSheet,
    //   {
    //     raw: true,
    //     header: 1
    //   }
    // );

    // console.time("Gemini API call");
    // const gemini = new GeminiService();

    // // Extract column names and sample data for Gemini
    // const columnNames = (firstMatrix[0] || []).map(cell => String(cell || ""));
    // const sampleData = firstMatrix
    //   .slice(1, 3)
    //   .map(row => row.map(cell => String(cell || "")));

    // try {
    //   // Read README.md from the excel data folder
    //   const readmePath = `${excelDataFolder}/README.md`;
    //   const dataDescription = readFileSync(readmePath, "utf-8");

    //   const columnCategorization = await gemini.categorizeColumns({
    //     paperName,
    //     excelFileName,
    //     dataDescription,
    //     columnNames,
    //     columnData: sampleData
    //   });

    //   console.timeEnd("Gemini API call");
    //   console.log("\n🤖 Gemini Analysis Results:");
    //   console.log(
    //     "✅ Columns expected to have UNIQUE values:",
    //     columnCategorization.unique
    //   );
    //   console.log(
    //     "🔄 Columns expected to have SHARED values:",
    //     columnCategorization.shared
    //   );
    //   console.log(
    //     "\nNote: Fraud detection will focus on duplicate analysis in 'unique' columns\n"
    //   );
    // } catch (error) {
    //   console.timeEnd("Gemini API call");
    //   console.warn(
    //     "⚠️ Gemini API failed, proceeding with standard analysis:",
    //     error
    //   );
    // }

    const repeatedSequences: (RepeatedSequence & { sheetName: string })[] = [];
    const topEntropyDuplicateNumbers: DuplicateValue[] = [];
    const topOccurenceHighEntropyDuplicateNumbers: DuplicateValue[] = [];
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
    console.log(`Top entropy duplicate numbers:`);
    console.table(humanReadableTopEntropyDuplicateNumbers);
    console.log(`Top occurance numbers with entropy>5000:`);
    console.table(humanReadableTopOccurenceNumbers);
    console.log(`Repeated sequences:`);
    console.table(humanReadableSequences);
    console.timeEnd("Time elapsed");
  });

program.parse();
