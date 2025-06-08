import xlsx from "xlsx";
import { roundFloatingPointInaccuracies } from "../utils/roundFloatingPointInaccuracies.js";

export interface EnhancedCell {
  value: unknown;
  formattedValue: string;
  isDate: boolean;
  isNumeric: boolean;
  originalCell: xlsx.CellObject | null;
}

export class Sheet {
  public readonly name: string;
  public readonly enhancedMatrix: EnhancedCell[][];
  public readonly invertedEnhancedMatrix: EnhancedCell[][];
  private readonly workbookSheet: xlsx.WorkSheet;

  constructor(workbookSheet: xlsx.WorkSheet, sheetName: string) {
    // Store original worksheet for format access
    this.workbookSheet = workbookSheet;

    // Build enhanced matrix with full cell data
    this.enhancedMatrix = this.buildEnhancedMatrix();
    this.invertedEnhancedMatrix = Sheet.invertEnhancedMatrix(
      this.enhancedMatrix
    );

    // Calculate properties
    this.name = sheetName;
  }

  get numRows(): number {
    return this.enhancedMatrix.length;
  }

  get numColumns(): number {
    return this.enhancedMatrix[0]?.length || 0;
  }

  get columnNames(): string[] {
    return (this.enhancedMatrix[0] || []).map(cell => String(cell.value || ""));
  }

  get numNumericCells(): number {
    let numberCount = 0;
    this.enhancedMatrix.forEach(row =>
      row.forEach(cell => {
        if (cell.isNumeric && !cell.isDate) {
          numberCount++;
        }
      })
    );
    return numberCount;
  }

  getFirstNRows(n: number): unknown[][] {
    return this.enhancedMatrix
      .slice(1, n + 1)
      .map(row => row.map(cell => cell.value)); // Skip header row, take n data rows
  }

  isCellDate(row: number, col: number): boolean {
    return this.enhancedMatrix[row]?.[col]?.isDate ?? false;
  }

  private buildEnhancedMatrix(): EnhancedCell[][] {
    // First get the basic matrix structure
    const basicMatrix: unknown[][] = xlsx.utils.sheet_to_json(
      this.workbookSheet,
      {
        raw: true,
        header: 1
      }
    );

    // Get worksheet range for accessing individual cells
    const range = this.workbookSheet["!ref"]
      ? xlsx.utils.decode_range(this.workbookSheet["!ref"])
      : {
          s: { r: 0, c: 0 },
          e: { r: basicMatrix.length - 1, c: (basicMatrix[0]?.length || 0) - 1 }
        };

    // Build enhanced matrix
    const enhancedMatrix: EnhancedCell[][] = [];

    for (let row = 0; row < basicMatrix.length; row++) {
      enhancedMatrix[row] = [];
      for (let col = 0; col < (basicMatrix[row]?.length || 0); col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
        const originalCell: xlsx.CellObject | null =
          this.workbookSheet[cellAddress] || null;
        const value = basicMatrix[row][col];

        const isDate = this.isDateCell(originalCell);
        const isNumeric = typeof value === "number" && !isDate;
        const formattedValue = originalCell?.w || String(value || "");

        enhancedMatrix[row][col] = {
          value: isNumeric
            ? roundFloatingPointInaccuracies(value as number)
            : value,
          formattedValue,
          isDate,
          isNumeric,
          originalCell
        };
      }
    }

    return enhancedMatrix;
  }

  private isDateCell(cell: xlsx.CellObject | null): boolean {
    if (!cell) return false;

    // Check if cell type is explicitly date
    if (cell.t === "d") {
      return true;
    }

    // For numeric cells, check if the formatted value looks like a date
    if (cell.t === "n" && cell.w) {
      // Common date patterns: MM/DD/YY, MM/DD/YYYY, M/D/YY, etc.
      const datePattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
      return datePattern.test(cell.w);
    }

    return false;
  }

  static invertEnhancedMatrix(matrix: EnhancedCell[][]): EnhancedCell[][] {
    const invertedMatrix: EnhancedCell[][] = [];
    for (let i = 0; i < (matrix[0]?.length || 0); i++) {
      invertedMatrix[i] = [];
      for (let j = 0; j < matrix.length; j++) {
        invertedMatrix[i][j] = matrix[j][i];
      }
    }
    return invertedMatrix;
  }
}
