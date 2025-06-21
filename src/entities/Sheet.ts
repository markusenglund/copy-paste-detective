import xlsx from "xlsx";
import { EnhancedCell } from "./EnhancedCell";

export class Sheet {
  public readonly name: string;
  public readonly enhancedMatrix: EnhancedCell[][];
  public readonly invertedEnhancedMatrix: EnhancedCell[][];
  public readonly numNumericCells: number;
  private readonly workbookSheet: xlsx.WorkSheet;

  constructor(workbookSheet: xlsx.WorkSheet, sheetName: string) {
    // Store original worksheet for format access
    this.workbookSheet = workbookSheet;

    // Build enhanced matrix with full cell data
    this.enhancedMatrix = this.buildEnhancedMatrix();
    this.invertedEnhancedMatrix = Sheet.invertEnhancedMatrix(
      this.enhancedMatrix,
    );

    this.numNumericCells = this.getNumNumericCells();
    this.name = sheetName;
  }

  get numRows(): number {
    return this.enhancedMatrix.length;
  }

  get numColumns(): number {
    return this.enhancedMatrix[0]?.length || 0;
  }

  get columnNames(): string[] {
    return (this.enhancedMatrix[0] || []).map((cell) =>
      String(cell.value || ""),
    );
  }

  get numericColumnIndices(): number[] {
    const numericColumns: number[] = [];
    const sampleRows = Math.min(10, this.numRows);

    for (let colIndex = 0; colIndex < this.numColumns; colIndex++) {
      const hasNumericData = this.enhancedMatrix
        .slice(0, sampleRows)
        .some((row) => {
          const cell = row[colIndex];
          return cell?.isNumeric && !cell.isDate;
        });

      if (hasNumericData) {
        numericColumns.push(colIndex);
      }
    }

    return numericColumns;
  }

  getNumNumericCells(): number {
    let numberCount = 0;
    this.enhancedMatrix.forEach((row) =>
      row.forEach((cell) => {
        if (cell.isAnalyzable) {
          numberCount++;
        }
      }),
    );
    return numberCount;
  }

  getFirstNRows(n: number): unknown[][] {
    return this.enhancedMatrix
      .slice(1, n + 1)
      .map((row) => row.map((cell) => cell.value)); // Skip header row, take n data rows
  }

  getColumnIndex(columnName: string): number {
    return this.columnNames.indexOf(columnName);
  }

  isCellDate(row: number, col: number): boolean {
    return this.enhancedMatrix[row]?.[col]?.isDate ?? false;
  }

  private buildEnhancedMatrix(): EnhancedCell[][] {
    // Build enhanced matrix directly from worksheet without sheet_to_json
    if (!this.workbookSheet["!ref"]) {
      return []; // Empty worksheet
    }

    const range = xlsx.utils.decode_range(this.workbookSheet["!ref"]);
    const enhancedMatrix: EnhancedCell[][] = [];

    // Initialize matrix with proper dimensions
    for (let row = range.s.r; row <= range.e.r; row++) {
      const matrixRowIndex = row - range.s.r;
      enhancedMatrix[matrixRowIndex] = [];

      for (let col = range.s.c; col <= range.e.c; col++) {
        const matrixColIndex = col - range.s.c;
        const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
        const originalCell: xlsx.CellObject | null =
          this.workbookSheet[cellAddress] || null;

        enhancedMatrix[matrixRowIndex][matrixColIndex] = new EnhancedCell(
          originalCell,
          row,
          col,
        );
      }
    }

    return enhancedMatrix;
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
