import { getNumDecimals } from "./getNumDecimals";

export interface LogarithmMatch {
  base: number;
  argument: number;
  argumentRoundingOffset: number;
}

export function detectNaturalLogarithm(
  logarithm: number,
  { tolerance: minTolerance = 0.00005 } = {},
): LogarithmMatch | null {
  const numDecimals = getNumDecimals(logarithm);
  if (numDecimals < 4) {
    return null;
  }

  const tolerance = Math.min(minTolerance, Math.pow(10, -numDecimals + 2));

  const argument = Math.exp(logarithm);
  const roundedArgument = Math.round(argument);
  const argumentRoundingOffset = Math.abs(argument - roundedArgument);

  if (argumentRoundingOffset < tolerance && roundedArgument !== 0) {
    const naturalLogarithmMatch = {
      base: Math.E,
      argument: roundedArgument,
      argumentRoundingOffset,
    };
    console.log({ naturalLogarithmMatch });
    return naturalLogarithmMatch;
  }

  return null;
}
