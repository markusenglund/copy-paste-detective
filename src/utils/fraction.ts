import { getNumDecimals } from "./getNumDecimals";

export interface RepeatingFractionMatch {
  numerator: number;
  numeratorRoundingOffset: number;
  denominator: number;
}

export function detectRepeatingFraction(
  value: number,
): RepeatingFractionMatch | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  const numDecimals = getNumDecimals(value);
  if (numDecimals < 4) {
    return null;
  }

  const tolerance = 0.0001;
  const repeatingDecimalDenominators = [
    3, 7, 9, 11, 13, 17, 19, 23, 30, 90, 300,
  ];

  for (const denominator of repeatingDecimalDenominators) {
    const numerator = Math.abs(value) * denominator;
    const roundedNumerator = Math.round(numerator);

    const numeratorRoundingOffset = Math.abs(numerator - roundedNumerator);

    if (numeratorRoundingOffset < tolerance && roundedNumerator !== 0) {
      return {
        numerator: roundedNumerator,
        numeratorRoundingOffset,
        denominator,
      };
    }
  }

  return null;
}
