import { round } from "lodash-es";
import { getNumDecimals } from "./getNumDecimals";

export interface RepeatingFractionMatch {
  numerator: number;
  numeratorRoundingOffset: number;
  denominator: number;
}

export function detectRepeatingFraction(
  value: number,
  { tolerance: minTolerance = 0.0001 } = {},
): RepeatingFractionMatch | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  const numDecimals = getNumDecimals(value);
  if (numDecimals < 4) {
    return null;
  }

  const repeatingDecimalDenominators = [3, 7, 9, 11, 13, 17, 19, 21, 23];
  const maxDecimalPlacesToTry = 3;
  for (const denominator of repeatingDecimalDenominators) {
    for (let k = 0; k <= maxDecimalPlacesToTry; k++) {
      const tolerance = Math.min(
        minTolerance * Math.pow(10, -k * 1.5),
        Math.pow(10, -numDecimals + 2),
      );
      const numerator = Math.abs(value) * denominator;
      const roundedNumerator = round(numerator, k);

      const numeratorRoundingOffset = Math.abs(numerator - roundedNumerator);

      // console.log({
      //   value,
      //   denominator,
      //   numerator,
      //   k,
      //   tolerance,
      //   numeratorRoundingOffset,
      //   diff: numeratorRoundingOffset - tolerance,
      // });
      if (numeratorRoundingOffset < tolerance && roundedNumerator !== 0) {
        return {
          numerator: Math.round(roundedNumerator * Math.pow(10, k)),
          numeratorRoundingOffset,
          denominator,
        };
      }
    }
  }

  return null;
}
