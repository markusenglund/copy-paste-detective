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
    return this.buildColumnNames();
  }

  /**
   * Build column names, potentially combining double header rows
   */
  private buildColumnNames(): string[] {
    if (this.enhancedMatrix.length === 0) {
      return [];
    }

    const firstRow = this.enhancedMatrix[0] || [];
    const secondRow = this.enhancedMatrix[1] || [];

    // Check if we have merged cells in the first row (indicating double headers)
    const mergedRanges = this.getMergedRanges();
    const hasFirstRowMergedCells = mergedRanges.some(
      (range) => range.startRow === 0,
    );

    if (!hasFirstRowMergedCells || secondRow.length === 0) {
      // No merged cells in first row or no second row - use standard single header
      return firstRow.map((cell) => String(cell.value || ""));
    }

    // Build combined column names from double headers
    const columnNames: string[] = [];

    for (let colIndex = 0; colIndex < firstRow.length; colIndex++) {
      const mergedRange = this.getMergedRangeForCell(0, colIndex);
      const secondRowValue = String(secondRow[colIndex]?.value || "");

      if (mergedRange && mergedRange.value) {
        // This column is part of a merged header - combine the values
        const combinedName =
          mergedRange.value + (secondRowValue ? " - " + secondRowValue : "");
        columnNames.push(combinedName);
      } else {
        // This column doesn't have a merged header - use second row or fall back to first row
        const firstRowValue = String(firstRow[colIndex]?.value || "");
        columnNames.push(secondRowValue || firstRowValue);
      }
    }

    return columnNames;
  }

  get numericColumnIndices(): number[] {
    const numericColumns: number[] = [];
    const headerRowCount = this.getHeaderRowCount();
    const sampleRows = Math.min(10, this.numRows - headerRowCount);

    for (let colIndex = 0; colIndex < this.numColumns; colIndex++) {
      const hasNumericData = this.enhancedMatrix
        .slice(headerRowCount, headerRowCount + sampleRows)
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

  get logNumberCountModifier(): number {
    return Math.max(Math.log10(this.numNumericCells), 3);
  }

  getNumNumericCells(): number {
    let numberCount = 0;
    const headerRowCount = this.getHeaderRowCount();

    this.enhancedMatrix.slice(headerRowCount).forEach((row) =>
      row.forEach((cell) => {
        if (cell.isAnalyzable) {
          numberCount++;
        }
      }),
    );
    return numberCount;
  }

  getFirstNRows(n: number): unknown[][] {
    const headerRowCount = this.getHeaderRowCount();
    return this.enhancedMatrix
      .slice(headerRowCount, headerRowCount + n)
      .map((row) => row.map((cell) => cell.value)); // Skip header rows, take n data rows
  }

  /**
   * Get the number of header rows (1 for single header, 2 for double header)
   */
  private getHeaderRowCount(): number {
    if (this.enhancedMatrix.length < 2) {
      return 1;
    }

    const mergedRanges = this.getMergedRanges();
    const hasFirstRowMergedCells = mergedRanges.some(
      (range) => range.startRow === 0,
    );

    return hasFirstRowMergedCells ? 2 : 1;
  }

  getColumnIndex(columnName: string): number {
    return this.columnNames.indexOf(columnName);
  }

  isCellDate(row: number, col: number): boolean {
    return this.enhancedMatrix[row]?.[col]?.isDate ?? false;
  }

  /**
   * Get merged cell ranges from the worksheet
   */
  getMergedRanges(): Array<{
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
    value: string;
  }> {
    if (!this.workbookSheet["!merges"]) {
      return [];
    }

    return this.workbookSheet["!merges"].map((merge) => {
      const startRow = merge.s.r;
      const endRow = merge.e.r;
      const startCol = merge.s.c;
      const endCol = merge.e.c;

      // Get the value from the top-left cell of the merged range
      const cellAddress = xlsx.utils.encode_cell({ r: startRow, c: startCol });
      const cell = this.workbookSheet[cellAddress];
      const value = cell?.v ? String(cell.v) : "";

      return {
        startRow,
        endRow,
        startCol,
        endCol,
        value,
      };
    });
  }

  /**
   * Check if a specific cell is part of a merged range
   */
  isCellMerged(row: number, col: number): boolean {
    const mergedRanges = this.getMergedRanges();
    return mergedRanges.some(
      (range) =>
        row >= range.startRow &&
        row <= range.endRow &&
        col >= range.startCol &&
        col <= range.endCol,
    );
  }

  /**
   * Get the merged range that contains a specific cell, if any
   */
  getMergedRangeForCell(
    row: number,
    col: number,
  ): {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
    value: string;
  } | null {
    const mergedRanges = this.getMergedRanges();
    return (
      mergedRanges.find(
        (range) =>
          row >= range.startRow &&
          row <= range.endRow &&
          col >= range.startCol &&
          col <= range.endCol,
      ) || null
    );
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
