import { describe, it, expect } from "@jest/globals";
import { loadExcelFileFromFolder } from "../../src/utils/loadExcelFileFromFolder";
import { ExcelFileData } from "../../src/types/ExcelFileData";
import { categorizedColumnsBySheet } from "./mockedCategorizedColumnsBySheet";
import { runRepeatedColumnSequencesStrategy } from "../../src/strategies/repeatedColumnSequences/runRepeatedColumnSequencesStrategy";
import { SuspicionLevel } from "../../src/types";

describe("Neurexin-2 restricts synapse numbers - handling double headers", () => {
  it("Combines first two rows to create the column names if the first row is merged", () => {
    const datasetFolder = "benchmark-files/pnas_2300363120";
    const excelFileData = loadExcelFileFromFolder(datasetFolder, 0);
    const fig2Sheet = excelFileData.sheets[1];
    const { columnNames } = fig2Sheet;
    expect(columnNames).toEqual([
      "Fig 2B-D",
      "vGluT1 punta density - ΔCre",
      "vGluT1 punta density - Cre",
      "vGluT1 staining intensity - ΔCre",
      "vGluT1 staining intensity - Cre",
      "",
      "Homer punta density - ΔCre",
      "Homer punta density - Cre",
      "Homer staining intensity - ΔCre",
      "Homer staining intensity - Cre",
      "",
      "vGluT1/Homer colocalization - ΔCre",
      "vGluT1/Homer colocalization - Cre",
      "",
      "Fig 2F abd H",
      "mEPSC frequency - ΔCre",
      "mEPSC frequency - Cre",
      "mEPSC frequency - ΔCre",
      "mEPSC frequency - Cre",
      "",
      "mEPSC amplitude - ΔCre",
      "mEPSC amplitude - Cre",
      "mEPSC amplitude - ΔCre",
      "mEPSC amplitude - Cre",
      "",
      "mIPSC frequency - ΔCre",
      "mIPSC frequency - Cre",
      "mIPSC frequency - ΔCre",
      "mIPSC frequency - Cre",
      "mIPSC amplitude - ΔCre",
      "mIPSC amplitude - Cre",
      "mIPSC amplitude - ΔCre",
      "mIPSC amplitude - Cre",
    ]);
  });
});

describe("Neurexin-2 restricts synapse numbers", () => {
  let excelFileData: ExcelFileData;
  beforeAll(() => {
    const datasetFolder = "benchmark-files/pnas_2300363120";
    excelFileData = loadExcelFileFromFolder(datasetFolder, 0);
  });
  describe("Repeated sequence strategy", () => {
    it("Identifies the egregious 492-length copy-pasted sequence on columns AD and AE in sheet 'Fig 2'", async () => {
      const result = await runRepeatedColumnSequencesStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetSequence = result.sequences.find(
        (resultSequence) =>
          resultSequence.sheetName === "Fig 2" &&
          resultSequence.positions[0].cellId === "AD94" &&
          resultSequence.positions[1].cellId === "AE222",
      );

      expect(targetSequence).toBeDefined();
      expect(targetSequence!.values.length).toBe(492);
      expect(targetSequence!.suspicionLevel).toBe(SuspicionLevel.High);
    });

    it("Identifies the 4-length copy-pasted sequence on column E in sheet 'Fig 2'", async () => {
      const result = await runRepeatedColumnSequencesStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetSequence = result.sequences.find(
        (resultSequence) =>
          resultSequence.sheetName === "Fig 2" &&
          resultSequence.positions[0].cellId === "E3" &&
          resultSequence.positions[1].cellId === "E47",
      );

      expect(targetSequence).toBeDefined();
      expect(targetSequence!.values.length).toBe(4);
      expect(targetSequence!.suspicionLevel).toBe(SuspicionLevel.High);
    });

    it("Identifies a 2-length sequence on columns J and K in sheet 'Fig 3'", async () => {
      const result = await runRepeatedColumnSequencesStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetSequence = result.sequences.find(
        (resultSequence) =>
          resultSequence.sheetName === "Fig 3" &&
          resultSequence.positions[0].cellId === "J6" &&
          resultSequence.positions[1].cellId === "K12",
      );

      expect(targetSequence).toBeDefined();
      expect(targetSequence!.values.length).toBe(2);
    });

    it("Identifies a 2-length sequence on columns B and C in sheet 'Fig 4'", async () => {
      const result = await runRepeatedColumnSequencesStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetSequence = result.sequences.find(
        (resultSequence) =>
          resultSequence.sheetName === "Fig 4" &&
          resultSequence.positions[0].cellId === "B5" &&
          resultSequence.positions[1].cellId === "C4",
      );

      expect(targetSequence).toBeDefined();
      expect(targetSequence!.values.length).toBe(2);
    });

    it("Identifies an absurd 18-length copy-pasted sequence on columns B and E in sheet 'Fig 5'", async () => {
      const result = await runRepeatedColumnSequencesStrategy(excelFileData, {
        categorizedColumnsBySheet,
      });
      const targetSequence = result.sequences.find(
        (resultSequence) =>
          resultSequence.sheetName === "Fig 5" &&
          resultSequence.positions[0].cellId === "B26" &&
          resultSequence.positions[1].cellId === "E44",
      );

      expect(targetSequence).toBeDefined();
      expect(targetSequence!.values.length).toBe(18);
      expect(targetSequence!.suspicionLevel).toBe(SuspicionLevel.High);
    });
  });
});
