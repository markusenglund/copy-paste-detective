import { Command } from "@commander-js/extra-typings";
import { loadExcelFileFromFolder } from "../utils/loadExcelFileFromFolder";
import { categorizeColumnsWithGemini } from "../ai/GeminiColumnCategorizer";

interface SheetTestCase {
  sheetName: string;
  expectedCategorization: {
    mustBeIncluded: string[];
    mustNotBeIncluded: string[];
  };
}

interface TestCase {
  folder: string;
  fileIndex: number;
  description: string;
  sheets: SheetTestCase[];
}

const testCases: TestCase[] = [
  {
    folder: "benchmark-files/doi_10_5061_dryad_stqjq2cdp__v20250418",
    fileIndex: 0,
    description: "Dual Drivers of Plant Invasions - Common garden",
    sheets: [
      {
        sheetName: "common garden-Herbiory",
        expectedCategorization: {
          mustBeIncluded: [
            "Insects(#)",
            "no-Hemiptera(#)",
            "Neuroptera(#)",
            "Hemiptera(#)",
            "Orthoptera(#)",
            "Lepidoptera(#)",
            "Araneida(#)",
            "Coleoptera(#)",
            "Diptera(#)",
            "Hymenoptera(#)",
            "others(#)"
          ],
          mustNotBeIncluded: []
        }
      },
      {
        sheetName: "common garden-data",
        expectedCategorization: {
          mustBeIncluded: [
            "Coarse root soluble sugar concentrations(mg/g)",
            "Fine root soluble sugar concentrations(mg/g)",
            "AMF colonization rate(%)",
            "Damage(%)",
            "Aboveground mass(g)",
            "Belowground mass(g)",
            "Root length(cm)",
            "Root surface area(cm2)",
            "Root average diameter(mm)",
            "Root volume(cm3)",
            "Root tissue density(g/cm3)",
            "Fine root length(cm)",
            "Coarse root length(cm)",
            "Fine root surface area(cm2)",
            "Coarse root  surface area(cm2)"
          ],
          mustNotBeIncluded: []
        }
      }
    ]
  },
  {
    folder: "benchmark-files/doi_10_5061_dryad_stqjq2cdp__v20250418",
    fileIndex: 1,
    description: "Dual Drivers of Plant Invasions - Survey results",
    sheets: [
      {
        sheetName: "Field survey-Herbiory",
        expectedCategorization: {
          mustBeIncluded: [
            "Insects(#)",
            "no-Hemiptera(#)",
            "Neuroptera(#)",
            "Hemiptera(#)",
            "Orthoptera(#)",
            "Lepidoptera(#)",
            "Araneida(#)",
            "Coleoptera(#)",
            "Diptera(#)",
            "Hymenoptera(#)",
            "others(#)"
          ],
          mustNotBeIncluded: []
        }
      },
      {
        sheetName: "Field survey-data",
        expectedCategorization: {
          mustBeIncluded: [
            "Soil ph",
            "Soil water content（%）",
            "Coarse root soluble sugar concentrations(mg/g)",
            "Fine root soluble sugar concentrations(mg/g)",
            "AMF colonization rate(%)",
            "Damage(%)",
            "Aboveground mass(g)",
            "Belowground mass(g)",
            "Root length(cm)",
            "Root surface area(cm2)",
            "Root average diameter(mm)",
            "Root volume(cm3)",
            "Root tissue density(g/cm3)",
            "Fine root length(cm)",
            "Coarse root length(cm)",
            "Fine root surface area(cm2)",
            "Coarse root  surface area(cm2)"
          ],
          mustNotBeIncluded: [
            "Latitude",
            "Longitude",
            "Annual Mean Temperature（℃）",
            "Mean Diurnal Range（℃）",
            "Isothermality",
            "Temperature Seasonality",
            "Max Temperature of Warmest Month（℃）",
            "Min Temperature of Coldest Month（℃）",
            "Temperature Annual Range（℃）",
            "Mean Temperature of Wettest Quarter（℃）",
            "Mean Temperature of Driest Quarter（℃）",
            "Mean Temperature of Warmest Quarter（℃）",
            "Mean Temperature of Coldest Quarter（℃）",
            "Annual Precipitation（mm）",
            "Precipitation of Wettest Month（mm）",
            "Precipitation of Driest Month（mm）",
            "Precipitation Seasonality（mm）",
            "Precipitation of Wettest Quarter（mm）",
            "Precipitation of Driest Quarter（mm）",
            "Precipitation of Warmest Quarter（mm）",
            "Precipitation of Coldest Quarter（mm）"
          ]
        }
      }
    ]
  }
];

const program = new Command();

program
  .name("test-ai")
  .description("Test AI column categorization against expected results")
  .version("0.1.0");

program
  .description("Test Gemini AI column categorization accuracy per sheet")
  .action(async () => {
    for (const testCase of testCases) {
      const excelFileData = loadExcelFileFromFolder(
        testCase.folder,
        testCase.fileIndex
      );

      for (const sheetTestCase of testCase.sheets) {
        const sheet = excelFileData.sheets.find(
          s => s.name === sheetTestCase.sheetName
        );

        if (!sheet) {
          console.error(
            `Sheet "${sheetTestCase.sheetName}" not found in Excel file`
          );
          continue;
        }

        // Get AI categorization for this specific sheet
        const actualCategorization = await categorizeColumnsWithGemini({
          sheet,
          excelFileData
        });
        const uniqueColumnSet = new Set(actualCategorization.unique);
        const missingColumns =
          sheetTestCase.expectedCategorization.mustBeIncluded.filter(
            col => !uniqueColumnSet.has(col)
          );

        const unexpectedColumns =
          sheetTestCase.expectedCategorization.mustNotBeIncluded.filter(col =>
            uniqueColumnSet.has(col)
          );

        const isSuccess =
          missingColumns.length === 0 && unexpectedColumns.length === 0;
        if (isSuccess) {
          console.log(`[${testCase.description}] ${sheet.name}: ✅`);
        } else {
          console.log(`[${sheet.name}]: ❌`);
          console.log(
            `Gemini missed ${missingColumns.length} columns in sheet "${sheet.name}": ${missingColumns.join(", ")}`
          );
          console.log(
            `Gemini mistakenly included ${unexpectedColumns.length} columns in sheet "${sheet.name}": ${unexpectedColumns.join(", ")}`
          );
        }
      }
    }
  });

program.parse();
