import { describe, it, expect } from "@jest/globals";
import { loadExcelFileFromFolder } from "../../src/utils/loadExcelFileFromFolder";

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
