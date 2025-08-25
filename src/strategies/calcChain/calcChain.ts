import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import xlsx from "xlsx";

import { ExcelFileData } from "../../types/ExcelFileData";
import { StrategyName } from "../../types/strategies";
import { calcChainSchema } from "./calcChainSchema";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: true,
});

const calcChainStrategy = {
  name: StrategyName.CalcChain,
  execute: runCalcChainStrategy,
  printResults: (): void => {},
};

async function runCalcChainStrategy(
  excelFileData: ExcelFileData,
): Promise<void> {
  const zip = await JSZip.loadAsync(excelFileData.buffer);
  const calcChainXml = await zip.file("xl/calcChain.xml")?.async("string");
  if (!calcChainXml) {
    console.log(
      `No calcChain.xml found in the Excel file '${excelFileData.excelFileName}'`,
    );
    return;
  }
  const parsedXml: unknown = xmlParser.parse(calcChainXml);
  const { calcChain } = calcChainSchema.parse(parsedXml);

  let lastSheetId: number | undefined;
  const calcChainEntries = calcChain.c.map((node) => {
    const sheetId = node.i ?? lastSheetId;
    if (sheetId == null) {
      throw new Error("Unexpectedly didn't find a sheetId");
    }
    const { c: column, r: row } = xlsx.utils.decode_cell(node.r);
    return {
      sheetId,
      cellId: node.r,
      column,
      row,
    };
  });

  type Anomaly = {
    entry: (typeof calcChainEntries)[number];
    prev: (typeof calcChainEntries)[number];
    expectedRow: number;
  };
  const anomalies: Anomaly[] = [];
  for (let i = 1; i < calcChainEntries.length; i++) {
    const prev = calcChainEntries[i - 1];
    const entry = calcChainEntries[i];
    if (entry.sheetId !== prev.sheetId) {
      continue; // Different sheet, skip
    }
    if (entry.column !== prev.column) {
      continue; // Different column, skip
    }
    const expectedRow = prev.row + 1;
    if (entry.row !== expectedRow) {
      anomalies.push({ entry, prev, expectedRow });
    }
  }
  console.log(anomalies);
}

export default calcChainStrategy;
