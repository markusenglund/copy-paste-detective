import xlsx from "xlsx";
import { roundFloatingPointInaccuracies } from "../utils/roundFloatingPointInaccuracies.js";

export class Sheet {
  public readonly name: string;
  public readonly parsedMatrix: unknown[][];
  public readonly invertedMatrix: unknown[][];

  constructor(workbookSheet: xlsx.WorkSheet, sheetName: string) {
    // Convert worksheet to matrix
    const matrix: unknown[][] = xlsx.utils.sheet_to_json(workbookSheet, {
      raw: true,
      header: 1
    });

    // Calculate properties
    this.name = sheetName;
    this.parsedMatrix = Sheet.parseMatrix(matrix);
    this.invertedMatrix = Sheet.invertMatrix(this.parsedMatrix);
  }

  get numRows(): number {
    return this.parsedMatrix.length;
  }

  get numColumns(): number {
    return this.parsedMatrix[0]?.length || 0;
  }

  get columnNames(): string[] {
    return (this.parsedMatrix[0] || []).map(cell => String(cell || ""));
  }

  get numNumericCells(): number {
    let numberCount = 0;
    this.parsedMatrix.forEach(row =>
      row.forEach(cell => {
        if (typeof cell === "number") {
          numberCount++;
        }
      })
    );
    return numberCount;
  }

  getFirstNRows(n: number): unknown[][] {
    return this.parsedMatrix.slice(1, n + 1); // Skip header row, take n data rows
  }

  static parseMatrix(matrix: unknown[][]): unknown[][] {
    const parsedMatrix = matrix.map(row =>
      row.map(cell => {
        if (typeof cell === "number") {
          return roundFloatingPointInaccuracies(cell);
        }
        return cell;
      })
    );
    return parsedMatrix;
  }

  static invertMatrix(matrix: unknown[][]): unknown[][] {
    const invertedMatrix: unknown[][] = [];
    for (let i = 0; i < matrix[0].length; i++) {
      invertedMatrix[i] = [];
      for (let j = 0; j < matrix.length; j++) {
        invertedMatrix[i][j] = matrix[j][i];
      }
    }
    return invertedMatrix;
  }
}