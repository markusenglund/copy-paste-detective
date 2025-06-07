import { roundFloatingPointInaccuracies } from "src/utils/roundFloatingPointInaccuracies";

export function parseMatrix(matrix: unknown[][]): unknown[][] {
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

export function invertMatrix(matrix: unknown[][]): unknown[][] {
  const invertedMatrix: unknown[][] = [];
  for (let i = 0; i < matrix[0].length; i++) {
    invertedMatrix[i] = [];
    for (let j = 0; j < matrix.length; j++) {
      invertedMatrix[i][j] = matrix[j][i];
    }
  }
  return invertedMatrix;
}

export function getNumberCount(matrix: unknown[][]): number {
  let numberCount = 0;
  matrix.forEach(row =>
    row.forEach(cell => {
      if (typeof cell === "number") {
        numberCount++;
      }
    })
  );
  return numberCount;
}
