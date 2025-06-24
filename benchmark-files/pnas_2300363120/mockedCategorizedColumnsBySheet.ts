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
  unique: [],
  shared: [],
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
