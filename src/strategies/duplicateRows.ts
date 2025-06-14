import { Sheet } from "src/entities/Sheet";
import { findDuplicateRows } from "src/detection";
import { Strategy, StrategyContext, DuplicateRowsResult, StrategyName } from "src/types/strategies";
import { GeminiService } from "src/ai/geminiService";
import { readFileSync } from "fs";

export class DuplicateRowsStrategy implements Strategy {
  name = StrategyName.DuplicateRows;

  async execute(sheets: Sheet[], context: StrategyContext): Promise<DuplicateRowsResult> {
    const startTime = performance.now();
    
    const allDuplicateRows = [];

    // Get column categorization from Gemini for the first sheet
    let columnCategorization = null;
    if (sheets.length > 0) {
      const firstSheet = sheets[0];
      
      console.time("Gemini API call");
      const gemini = new GeminiService();

      // Extract column names and sample data for Gemini
      const columnNames = (firstSheet.enhancedMatrix[0] || []).map(cell => String(cell.value || ""));
      const sampleData = firstSheet.enhancedMatrix
        .slice(1, 3)
        .map(row => row.map(cell => String(cell.value || "")));

      try {
        // Read README.md from the excel data folder
        const readmePath = `${context.excelDataFolder}/README.md`;
        const dataDescription = readFileSync(readmePath, "utf-8");

        columnCategorization = await gemini.categorizeColumns({
          paperName: context.paperName,
          excelFileName: context.excelFileName,
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
    }

    // Find duplicate rows if Gemini categorization is available
    if (columnCategorization) {
      for (const sheet of sheets) {
        console.time("Duplicate rows");
        const { duplicateRows } = findDuplicateRows(
          sheet,
          columnCategorization
        );
        console.timeEnd("Duplicate rows");

        console.log(
          `[${sheet.name}] ${duplicateRows.length} duplicate row pairs found`
        );

        allDuplicateRows.push(...duplicateRows);
      }
    }

    const executionTime = performance.now() - startTime;

    return {
      name: StrategyName.DuplicateRows,
      executionTime,
      duplicateRows: allDuplicateRows
    };
  }
}