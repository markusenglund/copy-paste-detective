import { round } from "lodash-es";
import { getNumDecimals } from "./getNumDecimals";

export interface LogarithmMatch {
  base: number;
  argument: number;
  argumentRoundingOffset: number;
  tolerance: number;
}

export function detectNaturalLogarithm(
  logarithm: number,
  { tolerance: minTolerance = 0.00005 } = {},
): LogarithmMatch | null {
  const numDecimals = getNumDecimals(logarithm);
  if (numDecimals < 4) {
    return null;
  }

  const maxDecimalPlacesToTry = 4;

  for (let k = 0; k <= maxDecimalPlacesToTry; k++) {
    const tolerance = Math.min(
      minTolerance * Math.pow(10, -k),
      Math.pow(10, -numDecimals + 2),
    );

    const argument = Math.exp(logarithm);
    const roundedArgument = round(argument, k);
    const argumentRoundingOffset = Math.abs(argument - roundedArgument);

    if (argumentRoundingOffset < tolerance && roundedArgument !== 0) {
      const naturalLogarithmMatch = {
        base: Math.E,
        argument: roundedArgument,
        argumentRoundingOffset,
        tolerance,
      };
      return naturalLogarithmMatch;
    }
  }

  return null;
}
