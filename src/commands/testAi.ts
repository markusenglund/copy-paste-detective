import { Command } from "@commander-js/extra-typings";
import { loadExcelFileFromFolder } from "../utils/loadExcelFileFromFolder";
import { screenColumnsGemini } from "../ai/geminiService";

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
            "others(#)",
          ],
          mustNotBeIncluded: [],
        },
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
            "Coarse root  surface area(cm2)",
          ],
          mustNotBeIncluded: [],
        },
      },
    ],
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
            "others(#)",
          ],
          mustNotBeIncluded: [],
        },
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
            "Coarse root  surface area(cm2)",
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
            "Precipitation of Coldest Quarter（mm）",
          ],
        },
      },
    ],
  },
  {
    folder: "benchmark-files/doi_10_5061_dryad_ksn02v7ft__v20250416",
    fileIndex: 0,
    description: "Hawk and owl feeding study",
    sheets: [
      {
        sheetName: "Sheet1",
        expectedCategorization: {
          mustBeIncluded: [
            "ẟ13Ccollagen (‰)",
            "Weight %C",
            "Amp 44",
            "ẟ15N (‰)",
            "Weight %N",
            "Amp 28",
            "Weight % C:N",
            "Atomic C:N",
          ],
          mustNotBeIncluded: [],
        },
      },
    ],
  },
  {
    folder: "benchmark-files/doi_10_5061_dryad_mt688__v20140814",
    fileIndex: 0,
    description: "Social spider personality measurement",
    sheets: [
      {
        sheetName: "Sheet5",
        expectedCategorization: {
          mustBeIncluded: [
            "Prosoma",
            "Boldness.1",
            "Boldness.2",
            "Boldness.3",
            "Boldness.4",
          ],
          mustNotBeIncluded: [],
        },
      },
    ],
  },
  {
    folder: "benchmark-files/pnas_2300363120",
    fileIndex: 0,
    description: "Neurexin-2 study data",
    sheets: [
      {
        sheetName: "Fig 2",
        expectedCategorization: {
          mustBeIncluded: [
            "vGluT1 punta density - ΔCre",
            "vGluT1 punta density - Cre",
            "vGluT1 staining intensity - ΔCre",
            "vGluT1 staining intensity - Cre",
            "Homer punta density - ΔCre",
            "Homer punta density - Cre",
            "Homer staining intensity - ΔCre",
            "Homer staining intensity - Cre",
            "vGluT1/Homer colocalization - ΔCre",
            "vGluT1/Homer colocalization - Cre",
            "mEPSC frequency - ΔCre",
            "mEPSC frequency - Cre",
            "mEPSC amplitude - ΔCre",
            "mEPSC amplitude - Cre",
            "mIPSC frequency - ΔCre",
            "mIPSC frequency - Cre",
            "mIPSC amplitude - ΔCre",
            "mIPSC amplitude - Cre",
          ],
          mustNotBeIncluded: [],
        },
      },
      {
        sheetName: "Fig 3",
        expectedCategorization: {
          mustBeIncluded: [
            "AMPAR EPSC rise time - Cre",
            "AMPAR EPSC decay time - ΔCre",
          ],
          mustNotBeIncluded: [],
        },
      },
      {
        sheetName: "Fig 5",
        expectedCategorization: {
          mustBeIncluded: [
            "vGluT1 Puncta Density - ΔCre",
            "vGluT1 Puncta Density - Cre",
            "vGluT1 Puncta Density - SS4-SS5-",
            "vGluT1 Puncta Density - SS4+SS5-",
            "vGluT1 Puncta Density - SS4-SS5+",
            "vGluT1 Puncta Density - SS4+SS5+",
            "Homer1 Puncta Density - ΔCre",
            "Homer1 Puncta Density - Cre",
            "Homer1 Puncta Density - SS4-SS5-",
            "Homer1 Puncta Density - SS4+SS5-",
            "Homer1 Puncta Density - SS4-SS5+",
            "Homer1 Puncta Density - SS4+SS5+",
            "vGluT1/Homer colocalization - ΔCre",
            "vGluT1/Homer colocalization - Cre",
            "vGluT1/Homer colocalization - SS4-SS5-",
            "vGluT1/Homer colocalization - SS4+SS5-",
            "vGluT1/Homer colocalization - SS4-SS5+",
            "vGluT1/Homer colocalization - SS4+SS5+",
          ],
          mustNotBeIncluded: [],
        },
      },
    ],
  },
  {
    folder: "benchmark-files/doi_10_5061_dryad_5tb2rbpfh__v20250418",
    fileIndex: 0,
    description: "Drought decreases carbon flux in bamboo",
    sheets: [
      {
        sheetName: "Leaves to Soil",
        expectedCategorization: {
          mustBeIncluded: [
            "Leave 13C‰",
            "Branches 13C‰",
            "Roots 13C‰",
            "0-15 Soil 13C‰",
            "15-30 Soil 13C‰",
            "Leave 13C atom%",
            "Branches 13C atom%",
            "Roots 13C atom%",
            "0-15 Soil13C atom%",
            "10-30 Soil 13C atom%",
            "Leave 13C amount",
            "Branches 13C amount",
            "Roots 13C amount",
            "0-15 Soil13C amount",
            "10-30 Soil 13C amount",
          ],
          mustNotBeIncluded: ["sample time(d)"],
        },
      },
    ],
  },
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
        testCase.fileIndex,
      );

      for (const sheetTestCase of testCase.sheets) {
        const sheet = excelFileData.sheets.find(
          (s) => s.name === sheetTestCase.sheetName,
        );

        if (!sheet) {
          console.error(
            `Sheet "${sheetTestCase.sheetName}" not found in Excel file`,
          );
          continue;
        }
        const sampleData = sheet.enhancedMatrix
          .slice(sheet.firstDataRowIndex, sheet.firstDataRowIndex + 2)
          .map((row) => row.map((cell) => String(cell.value || "")));

        // Get AI categorization for this specific sheet
        const actualCategorization = await screenColumnsGemini({
          paperName: excelFileData.articleName,
          excelFileName: excelFileData.excelFileName,
          readmeContent: excelFileData.dataDescription,
          columnNames: sheet.columnNames,
          columnData: sampleData,
        });
        const uniqueColumnSet = new Set(actualCategorization.unique);
        const missingColumns =
          sheetTestCase.expectedCategorization.mustBeIncluded.filter(
            (col) => !uniqueColumnSet.has(col),
          );

        const unexpectedColumns =
          sheetTestCase.expectedCategorization.mustNotBeIncluded.filter((col) =>
            uniqueColumnSet.has(col),
          );

        console.log(
          `${testCase.description} motivation: ${actualCategorization.motivation}`,
        );

        const isSuccess =
          missingColumns.length === 0 && unexpectedColumns.length === 0;
        if (isSuccess) {
          console.log(`[${testCase.description}] ${sheet.name}: ✅`);
        } else {
          console.log(`[${sheet.name}]: ❌`);
          console.log(
            `Gemini missed ${missingColumns.length} columns in sheet "${sheet.name}": ${missingColumns.join(", ")}`,
          );
          console.log(
            `Gemini mistakenly included ${unexpectedColumns.length} columns in sheet "${sheet.name}": ${unexpectedColumns.join(", ")}`,
          );
        }
      }
    }
  });

program.parse();
