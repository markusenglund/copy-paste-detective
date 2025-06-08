import xlsx from "xlsx";
import { roundFloatingPointInaccuracies } from "../utils/roundFloatingPointInaccuracies.js";

export class Sheet {
  public readonly name: string;
  public readonly numRows: number;
  public readonly numColumns: number;
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
    this.numRows = matrix.length;
    this.numColumns = matrix[0]?.length || 0;
    this.parsedMatrix = Sheet.parseMatrix(matrix);
    this.invertedMatrix = Sheet.invertMatrix(this.parsedMatrix);
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