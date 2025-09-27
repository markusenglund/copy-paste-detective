import { detectRepeatingFraction } from "./fraction";
import { getNumDecimals } from "./getNumDecimals";

export interface SquareRootMatch {
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

export type SquareRootOfFractionMatch = {
  radicand: number;
  roundingOffset: number;
  numerator: number;
  denominator: number;
};

export function detectSquareRootOfFraction(
  value: number,
): SquareRootOfFractionMatch | null {
  const tolerance = 0.00001;

  const numDecimals = getNumDecimals(value);
  if (numDecimals < 4 || value < 0.1) {
    return null;
  }

  const squareRootRepeatingFractionMatch = detectRepeatingFraction(
    Math.pow(value, 2),
    { tolerance },
  );
  if (squareRootRepeatingFractionMatch) {
    return {
      radicand:
        squareRootRepeatingFractionMatch.numerator /
        squareRootRepeatingFractionMatch.denominator,
      roundingOffset: squareRootRepeatingFractionMatch.numeratorRoundingOffset,
      numerator: squareRootRepeatingFractionMatch.numerator,
      denominator: squareRootRepeatingFractionMatch.denominator,
    };
  }
  return null;
}
