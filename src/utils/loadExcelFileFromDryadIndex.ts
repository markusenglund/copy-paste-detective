import { readFileSync } from "fs";
import path from "path";
import xlsx from "xlsx";
import { Sheet } from "../entities/Sheet";
import { ExcelFileData } from "../types/ExcelFileData";
import { DryadDataset } from "../dryad/DryadDataset";

export function loadExcelFileFromDryadIndex(
  dataset: DryadDataset,
  fileIndex: number = 0,
): ExcelFileData {
  // Validate file index range
  if (fileIndex >= dataset.excelFiles.length) {
    throw new Error(
      `Invalid file index: ${fileIndex}. Available files: 0-${dataset.excelFiles.length - 1}`,
    );
  }
  const datasetFolder = `data/dryad/files/${dataset.extId}`;
  const selectedFile = dataset.excelFiles[fileIndex];
  const excelPath = path.join(datasetFolder, selectedFile.filename);
  const workbook = xlsx.readFile(excelPath, { sheetRows: 5000 });

  const sheets: Sheet[] = [];
  workbook.SheetNames.slice(0, 10) // Limit to first 10 sheets
    .forEach((sheetName) => {
      const workbookSheet = workbook.Sheets[sheetName];
      try {
        const sheet = new Sheet(workbookSheet, sheetName);
        sheets.push(sheet);
      } catch (err) {
        console.log(
          `Skipping sheet '${sheetName}' due to error: ${err.message}`,
        );
      }
    });
  let dataDescription: string | undefined;
  if (dataset.readmeFile) {
    const readmePath = path.join(datasetFolder, dataset.readmeFile.filename);
    dataDescription = readFileSync(readmePath, "utf-8");
  } else if (dataset.usageNotes) {
    dataDescription = dataset.usageNotes;
  } else {
    throw new Error(
      `Dataset ${dataset.extId} has no README or usage notes available. Bailing out...`,
    );
  }

  return {
    sheets,
    excelFileName: selectedFile.filename,
    articleName: dataset.title,
    dataDescription,
  };
}
