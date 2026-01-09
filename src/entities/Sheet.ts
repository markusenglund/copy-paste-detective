import xlsx from "xlsx";
import { EnhancedCell } from "./EnhancedCell";
import { Column } from "./Column";
import { maxNumColumnsToAnalyze } from "../config/config";
import { logger } from "../utils/logger";

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
  public readonly sampleData: string[][];
  public readonly mergedRanges: MergedRange[];
  public readonly range: xlsx.Range;
  private readonly workbookSheet: xlsx.WorkSheet;
  public hasSheetsWithinSheet: boolean;
  public readonly excelFileName: string;
  constructor(
    workbookSheet: xlsx.WorkSheet,
    sheetName: string,
    excelFileName: string,
  ) {
    // Store original worksheet for format access
    this.workbookSheet = workbookSheet;
    this.name = sheetName;
    this.excelFileName = excelFileName;
    const ref = this.workbookSheet["!ref"];
    if (!ref) {
      throw new Error(`Sheet is empty!`);
    }

    this.range = xlsx.utils.decode_range(ref);
    // Build enhanced matrix with full cell data
    this.enhancedMatrix = this.buildEnhancedMatrix();
    if (this.enhancedMatrix.length === 0) {
      throw new Error(`Sheet is empty!`);
    }
    const { hasSheetsWithinSheet, firstSheetEndRowIndexExclusive } =
      this.detectSheetsWithinSheet();
    if (hasSheetsWithinSheet) {
      logger.info(
        `[${this.excelFileName}] Sheet '${sheetName}' has sheets within sheet. Only the first sheet ending on row number '${firstSheetEndRowIndexExclusive + 1}' (exclusive) will be analyzed.`,
      );
      this.enhancedMatrix = this.enhancedMatrix.slice(
        0,
        firstSheetEndRowIndexExclusive,
      );
    }
    this.hasSheetsWithinSheet = hasSheetsWithinSheet;
    this.invertedEnhancedMatrix = Sheet.invertEnhancedMatrix(
      this.enhancedMatrix,
    );

    this.mergedRanges = this.createMergedRanges();

    this.numNumericCells = this.getNumNumericCells();
    this.sampleData = this.getSampleData(2);
  }

  getColumns(): Column[] {
    const columns: Column[] = [];
    for (let i = 0; i < this.numColumns; i++) {
      columns.push(new Column(this, i));
    }

    return columns;
  }

  get numRows(): number {
    return this.enhancedMatrix.length;
  }

  get numColumns(): number {
    return this.enhancedMatrix[0]?.length || 0;
  }

  get columnNames(): string[] {
    return this.getColumns().map((column) => column.name);
  }

  getSampleData(
    numRows: number,
    startRowIndex: number = this.firstDataRowIndex,
  ): string[][] {
    const sampleData = this.enhancedMatrix
      .slice(startRowIndex, startRowIndex + numRows)
      .map((row) => row.map((cell) => String(cell.value ?? "")));
    if (sampleData.length < numRows) {
      throw new Error(`Couldn't find at least ${numRows} data rows`);
    }
    return sampleData;
  }

  getSampleRow(rowIndex: number): string[] {
    return this.enhancedMatrix[rowIndex].map((cell) =>
      String(cell.value ?? ""),
    );
  }

  /**
   * Get the effective value for a cell, considering merged ranges
   */
  getEffectiveValueForCell(rowIndex: number, colIndex: number): unknown {
    const mergedRange = this.getMergedRangeForCell(rowIndex, colIndex);
    if (mergedRange?.value) {
      return mergedRange.value;
    }

    const cell = this.enhancedMatrix[rowIndex]?.[colIndex];
    return cell?.value ?? null;
  }

  get numericColumnIndices(): number[] {
    const numericColumns: number[] = [];
    const numSampleRows = 10;

    for (let colIndex = 0; colIndex < this.numColumns; colIndex++) {
      const hasNumericData = this.enhancedMatrix
        .slice(this.firstDataRowIndex, this.firstDataRowIndex + numSampleRows)
        .some((row) => {
          const cell = row[colIndex];
          return cell?.isAnalyzable;
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

    this.enhancedMatrix.slice(this.firstDataRowIndex).forEach((row) =>
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
      .slice(this.firstDataRowIndex, this.firstDataRowIndex + n)
      .map((row) => row.map((cell) => cell.value)); // Skip header rows, take n data rows
  }

  get headerRowIndices(): number[] {
    const firstNonEmptyRowIndex = this.range.s.r;
    let rowIndex = firstNonEmptyRowIndex;
    const headerRowIndices = [];
    // We assume that a row with only cells that are analyzable is a data row, while rows with non-analyzable cells are header rows
    while (this.enhancedMatrix[rowIndex]?.every((cell) => !cell.isAnalyzable)) {
      headerRowIndices.push(rowIndex);
      if (headerRowIndices.length > 10) {
        throw new Error(
          `Unexpectedly didn't find any rows in the first ten rows with analyzable data`,
        );
      }
      rowIndex++;
    }
    if (headerRowIndices.length === 0) {
      throw new Error(`Couldn't find any header rows without numeric values`);
    }
    return headerRowIndices;
  }

  get headerRows(): EnhancedCell[][] {
    return this.headerRowIndices.map((index) => this.enhancedMatrix[index]);
  }

  get firstDataRowIndex(): number {
    return this.headerRowIndices.at(-1)! + 1;
  }

  // A spreadsheet might in some cases have multiple columns with the same name so we return an array of indices
  getColumnIndicesOfCombinedColumnName(columnName: string): number[] {
    const columnIndices: number[] = [];
    for (let i = 0; i < this.columnNames.length; i++) {
      if (this.columnNames[i] === columnName) {
        columnIndices.push(i);
      }
    }
    return columnIndices;
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
    const topColumnIndex = Math.min(this.range.e.c, maxNumColumnsToAnalyze);
    for (let row = 0; row <= this.range.e.r; row++) {
      enhancedMatrix[row] = [];
      for (let col = 0; col <= topColumnIndex; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
        const originalCell: xlsx.CellObject | null =
          this.workbookSheet[cellAddress] || null;

        enhancedMatrix[row][col] = new EnhancedCell(originalCell, row, col);
      }
    }

    return enhancedMatrix;
  }

  // When changing this algorithm, make sure to run the command dryad-find-sheets-within-sheet to verify that you're not introducing new types of false positives.
  private detectSheetsWithinSheet():
    | {
        hasSheetsWithinSheet: true;
        firstSheetEndRowIndexExclusive: number;
      }
    | {
        hasSheetsWithinSheet: false;
        firstSheetEndRowIndexExclusive: undefined;
      } {
    const firstDataRowIndex = this.firstDataRowIndex;
    /*
        A sheet is considered to have multiple sheets in it if the following pattern is found:
        - After a row with analyzable cells, there's at least one row with totally empty cells
        - Then there's a row with at least one cell with a string value but no analyzable cells - this is the second header row.
        - Then there's a row with at least one analyzable cell
    */
    let firstSheetEndRowIndexExclusiveCandidate: number | undefined;
    let hasSeenSecondHeaderRow: boolean = false;
    let latestEmptyRowIndex: number | undefined;
    for (
      let rowIndex = firstDataRowIndex;
      rowIndex < this.numRows;
      rowIndex++
    ) {
      const row = this.enhancedMatrix[rowIndex];
      const rowHasAnalyzableCells = row.some((cell) => cell.isAnalyzable);
      const rowHasOnlyStringOrEmptyCells = row.every(
        (cell) => typeof cell.value === "string" || cell.value === null,
      );
      const rowHasOnlyEmptyCells = row.every((cell) => cell.value === null);

      if (rowHasOnlyEmptyCells) {
        if (latestEmptyRowIndex !== rowIndex - 1) {
          firstSheetEndRowIndexExclusiveCandidate = rowIndex;
        }
        latestEmptyRowIndex = rowIndex;
        continue;
      }
      if (
        rowHasOnlyStringOrEmptyCells &&
        latestEmptyRowIndex === rowIndex - 1
      ) {
        hasSeenSecondHeaderRow = true;
        continue;
      }

      if (rowHasAnalyzableCells && hasSeenSecondHeaderRow) {
        return {
          hasSheetsWithinSheet: true,
          firstSheetEndRowIndexExclusive:
            firstSheetEndRowIndexExclusiveCandidate!,
        };
      }
    }
    return {
      hasSheetsWithinSheet: false,
      firstSheetEndRowIndexExclusive: undefined,
    };
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
