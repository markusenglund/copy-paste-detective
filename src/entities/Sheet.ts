import xlsx from "xlsx";
import { EnhancedCell } from "./EnhancedCell";

type MergedRange = {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  value: string;
};

export class Sheet {
  public readonly name: string;
  public readonly enhancedMatrix: EnhancedCell[][];
  public readonly invertedEnhancedMatrix: EnhancedCell[][];
  public readonly numNumericCells: number;
  public readonly mergedRanges: MergedRange[];
  public readonly range: xlsx.Range;
  private readonly workbookSheet: xlsx.WorkSheet;

  constructor(workbookSheet: xlsx.WorkSheet, sheetName: string) {
    // Store original worksheet for format access
    this.workbookSheet = workbookSheet;

    const ref = this.workbookSheet["!ref"];
    if (!ref) {
      throw new Error(`Sheet is empty!`);
    }

    this.range = xlsx.utils.decode_range(ref);
    // Build enhanced matrix with full cell data
    this.enhancedMatrix = this.buildEnhancedMatrix();
    this.invertedEnhancedMatrix = Sheet.invertEnhancedMatrix(
      this.enhancedMatrix,
    );

    this.mergedRanges = this.createMergedRanges();

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
   * Build column names, potentially combining multiple header rows
   */
  private buildColumnNames(): string[] {
    if (this.enhancedMatrix.length === 0) {
      return [];
    }

    const headerRowCount = this.getHeaderRowCount();

    if (headerRowCount === 1) {
      // Single header
      return this.enhancedMatrix[0].map((cell) => String(cell.value || ""));
    }

    // Multi-header - combine values from all header rows
    const columnNames: string[] = [];
    const numColumns = this.enhancedMatrix[0]?.length || 0;

    for (let colIndex = 0; colIndex < numColumns; colIndex++) {
      const headerValues: string[] = [];

      for (let rowIndex = 0; rowIndex < headerRowCount; rowIndex++) {
        const value = this.getEffectiveValueForCell(rowIndex, colIndex);
        if (value.trim()) {
          // Only include non-empty values
          headerValues.push(value);
        }
      }

      columnNames.push(headerValues.join(" - "));
    }

    return columnNames;
  }

  /**
   * Get the effective value for a cell, considering merged ranges
   */
  private getEffectiveValueForCell(rowIndex: number, colIndex: number): string {
    const mergedRange = this.getMergedRangeForCell(rowIndex, colIndex);
    if (mergedRange?.value) {
      return mergedRange.value;
    }

    const cell = this.enhancedMatrix[rowIndex]?.[colIndex];
    return String(cell?.value || "");
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
   * Get the number of header rows (1 for single, 2 for double, 3 for triple, etc.)
   */
  private getHeaderRowCount(): number {
    if (this.enhancedMatrix.length < 2) {
      return 1;
    }

    // Check if first row has merged cells
    const hasFirstRowMergedCells = this.mergedRanges.some(
      (range) => range.startRow === 0,
    );

    if (!hasFirstRowMergedCells) {
      return 1; // Single header
    }

    // Find consecutive rows with merged cells starting from row 0
    let lastMergedRow = -1;
    for (
      let rowIndex = 0;
      rowIndex < Math.min(5, this.enhancedMatrix.length);
      rowIndex++
    ) {
      const hasRowMergedCells = this.mergedRanges.some(
        (range) => range.startRow === rowIndex,
      );
      if (hasRowMergedCells) {
        lastMergedRow = rowIndex;
      } else {
        break; // Found first row without merged cells
      }
    }

    // Header count is last merged row + 2 (to include the next row as final header)
    return Math.min(lastMergedRow + 2, this.enhancedMatrix.length);
  }

  get headerRowIndices(): number[] {
    // const firstNonEmptyRowIndex = this.enhancedMatrix
    //   .slice(0, 10)
    //   .findIndex((row) => row.some((cell) => cell.value !== null));
    // if (firstNonEmptyRowIndex === -1) {
    //   throw new Error(
    //     `Couldn't find any non-empty rows in the first 10 rows of the spreadsheet.`,
    //   );
    // }
    const firstNonEmptyRowIndex = this.range.s.r;
    let rowIndex = firstNonEmptyRowIndex;
    const headerRowIndices = [];
    // We assume that a row with only cells that are analyzable is a data row, while rows with non-analyzable cells are header rows
    while (this.enhancedMatrix[rowIndex].every((cell) => !cell.isAnalyzable)) {
      headerRowIndices.push(rowIndex);
      if (headerRowIndices.length > 5) {
        throw new Error(
          `Unexpectedly didn't find any rows in the first five rows with analyzable data`,
        );
      }
      rowIndex++;
    }
    if (headerRowIndices.length === 0) {
      throw new Error(`Couldn't find any header rows without numeric values`);
    }
    return headerRowIndices;
  }

  private getRowsWithMergedCells(): number[] {
    const startRows = this.mergedRanges.map(
      (mergedRange) => mergedRange.startRow,
    );
    const uniqueRows = [...new Set(startRows)];
    uniqueRows.sort();
    return uniqueRows;
  }

  getColumnIndex(columnName: string): number {
    return this.columnNames.indexOf(columnName);
  }

  isCellDate(row: number, col: number): boolean {
    return this.enhancedMatrix[row]?.[col]?.isDate ?? false;
  }

  private createMergedRanges(): Array<MergedRange> {
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
    return this.mergedRanges.some(
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
    return (
      this.mergedRanges.find(
        (range) =>
          row >= range.startRow &&
          row <= range.endRow &&
          col >= range.startCol &&
          col <= range.endCol,
      ) || null
    );
  }

  private buildEnhancedMatrix(): EnhancedCell[][] {
    const enhancedMatrix: EnhancedCell[][] = [];

    // Initialize matrix with proper dimensions
    for (let row = 0; row <= this.range.e.r; row++) {
      console.log({ row }, this.range.s.r);
      enhancedMatrix[row] = [];

      for (let col = 0; col <= this.range.e.c; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
        const originalCell: xlsx.CellObject | null =
          this.workbookSheet[cellAddress] || null;

        enhancedMatrix[row][col] = new EnhancedCell(originalCell, row, col);
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
