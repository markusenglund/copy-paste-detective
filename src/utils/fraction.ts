export interface RepeatingFractionMatch {
  numerator: number;
  denominator: number;
}

export function detectRepeatingFraction(
  value: number,
): RepeatingFractionMatch | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  const numDecimals = value.toString().split(".")[1]?.length || 0;
  if (numDecimals < 4) {
    return null;
  }

  const tolerance = 0.001;
  const repeatingDecimalDenominators = [3, 7, 9, 11, 30, 90, 300];

  for (const denominator of repeatingDecimalDenominators) {
    const numerator = Math.abs(value) * denominator;
    const roundedNumerator = Math.round(numerator);

    if (
      Math.abs(numerator - roundedNumerator) < tolerance &&
      roundedNumerator !== 0
    ) {
      return {
        numerator: roundedNumerator,
        denominator,
      };
    }
  }

  return null;
}
