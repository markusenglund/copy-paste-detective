import { getNumDecimals } from "./getNumDecimals";

interface SquareRootMatch {
  roundingOffset: number;
  radicand: number;
}

export function detectSquareRoot(value: number): SquareRootMatch | null {
  const tolerance = 0.001;
  const numDecimals = getNumDecimals(value);
  if (numDecimals < 4 || value < 0.1) {
    return null;
  }

  const radicand = Math.pow(value, 2);
  const roundedRadicand = Math.round(100 * radicand) / 100;
  const roundingOffset = Math.abs(radicand - roundedRadicand);
  if (roundingOffset < tolerance / 100) {
    return {
      roundingOffset,
      radicand: roundedRadicand,
    };
  }
  return null;
}
