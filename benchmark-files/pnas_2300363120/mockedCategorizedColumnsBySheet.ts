import {
  categorizeColumns,
  CategorizedColumn,
} from "../../src/columnCategorization/columnCategorization";
import { ExcelFileData } from "../../src/types/ExcelFileData";

export async function loadMockedCategorizedColumnsBySheet(
  excelFileData: ExcelFileData,
): Promise<Map<string, CategorizedColumn[]>> {
  const categorizedColumnsBySheet = new Map<string, CategorizedColumn[]>();
  const uniqueColumnsBySheet = new Map<string, Set<string>>();
  uniqueColumnsBySheet.set("Fig 1", new Set([]));
  uniqueColumnsBySheet.set(
    "Fig 2",
    new Set([
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
      "mEPSC frequency - ΔCre",
      "mEPSC frequency - Cre",
      "mEPSC amplitude - ΔCre",
      "mEPSC amplitude - Cre",
      "mEPSC amplitude - ΔCre",
      "mEPSC amplitude - Cre",
      "mIPSC frequency - ΔCre",
      "mIPSC frequency - Cre",
      "mIPSC frequency - ΔCre",
      "mIPSC frequency - Cre",
      "mIPSC amplitude - ΔCre",
      "mIPSC amplitude - Cre",
      "mIPSC amplitude - ΔCre",
      "mIPSC amplitude - Cre",
    ]),
  );
  uniqueColumnsBySheet.set(
    "Fig 3",
    new Set([
      "AMPAR Amplitude - ΔCre",
      "AMPAR Amplitude - Cre",
      "AMPAR EPSC Coefficient of Variation - ΔCre",
      "AMPAR EPSC Coefficient of Variation - Cre",
      "AMPAR EPSC rise time - ΔCre",
      "AMPAR EPSC rise time - Cre",
      "AMPAR EPSC decay time - ΔCre",
      "AMPAR EPSC decay time - Cre",
      "NMDAR Amplitude - ΔCre",
      "NMDAR Amplitude - Cre",
      "NMDA EPSC Coefficient of Variation - ΔCre",
      "NMDA EPSC Coefficient of Variation - Cre",
      "NMDA EPSC decay time - ΔCre",
      "NMDA EPSC decay time - Cre",
      "Peak #",
      "time interval (ms)",
      "DCre - Ampllitude (pA)",
      "DCre - paired-pulse ratio",
      "Cre - Ampllitude (pA)",
      "Cre - paired-pulse ratio",
      "[Ca] (mM)",
      "DCre - Fitted Max Value (pA)",
      "DCre - EC50",
      "Hill Coefficient",
      "Normalized Ampl. to Fitted Max Value",
      "Cre - Fitted Max Value (pA)",
      "Cre - EC50",
    ]),
  );
  uniqueColumnsBySheet.set(
    "Fig 4",
    new Set([
      "mEPSC frequency - ΔCre - Vehicle",
      "mEPSC frequency - ΔCre - LY379268",
      "mEPSC frequency - Cre - Vehicle",
      "mEPSC frequency - Cre - LY379268",
      "mEPSC amplitude - ΔCre - Vehicle",
      "mEPSC amplitude - ΔCre - LY379268",
      "mEPSC amplitude - Cre - Vehicle",
      "mEPSC amplitude - Cre - LY379268",
      "1st NMDA-EPSC - ΔCre - Vehicle",
      "1st NMDA-EPSC - ΔCre - LY379268",
      "1st NMDA-EPSC - Cre - Vehicle",
      "1st NMDA-EPSC - Cre - LY379268",
      "PPR - ΔCre - Vehicle",
      "PPR - ΔCre - LY379268",
      "PPR - Cre - Vehicle",
      "PPR - Cre - LY379268",
    ]),
  );
  uniqueColumnsBySheet.set(
    "Fig 5",
    new Set([
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
    ]),
  );
  uniqueColumnsBySheet.set("Fig 6", new Set([]));
  uniqueColumnsBySheet.set("Fig S1", new Set([]));
  uniqueColumnsBySheet.set("Fig S2", new Set([]));

  for (const sheet of excelFileData.sheets) {
    const uniqueColumns = uniqueColumnsBySheet.get(sheet.name);
    if (!uniqueColumns) {
      throw new Error(`Unique columns not defined for sheet: ${sheet.name}`);
    }
    const columns: CategorizedColumn[] = (
      await categorizeColumns(sheet, excelFileData, {
        excludeAiProfile: true,
      })
    ).map((column) => ({
      ...column,
      isIncludedInAnalysis: uniqueColumns.has(column.name) || false,
    }));
    categorizedColumnsBySheet.set(sheet.name, columns);
  }

  return categorizedColumnsBySheet;
}
