import { ColumnCategorization } from "../../src/ai/geminiService";

export const categorizedColumnsBySheet = new Map<
  string,
  ColumnCategorization
>();

categorizedColumnsBySheet.set("Fig 1", {
  unique: [],
  shared: [],
  motivation: "",
});
categorizedColumnsBySheet.set("Fig 2", {
  unique: [
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
  ],
  shared: ["Fig 2B-D", "Fig 2F abd H"],
  motivation: "",
});
categorizedColumnsBySheet.set("Fig 3", {
  unique: [
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
  ],
  shared: [
    "Fig 3B",
    "Fig 3C",
    "Fig 3D",
    "Fig 3F",
    "Fig 3G",
    "Fig 3H",
    "Fig 3J and K",
    "Culture #",
    "DCre - Cell #",
    "DCre - File Name",
    "Cre - Cell #",
    "Cre - File Name",
    "Fig 3M-O",
    "Culture #",
    "DCre - Cell #",
    "DCre - File Name",
    "Cre - Cell #",
    "Cre - File Name",
  ],
  motivation: "",
});
categorizedColumnsBySheet.set("Fig 4", {
  unique: [],
  shared: [],
  motivation: "",
});
categorizedColumnsBySheet.set("Fig 5", {
  unique: [],
  shared: [],
  motivation: "",
});
categorizedColumnsBySheet.set("Fig 6", {
  unique: [],
  shared: [],
  motivation: "",
});
categorizedColumnsBySheet.set("Fig S1", {
  unique: [],
  shared: [],
  motivation: "",
});
categorizedColumnsBySheet.set("Fig S2", {
  unique: [],
  shared: [],
  motivation: "",
});
