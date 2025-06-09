import { roundFloatingPointInaccuracies } from "./roundFloatingPointInaccuracies";

export function calculateNumberEntropy(value: number): number {
  // Values that are common years should receive an entropy score of 100
  if (value >= 1900 && value <= 2030 && Number.isInteger(value)) {
    return 100;
  }

  const denominators = [2, 3, 7, 9, 11, 13, 17, 19, 23];
  const rawBaseNumberEntropy = calculateRawNumberEntropy(value);
  const numeratorEntropies = denominators.map(denominator => {
    const numerator = value * denominator;
    const roundedNumerator = roundFloatingPointInaccuracies(numerator, 8, 1e-8);
    const roundedNumeratorEntropy = calculateRawNumberEntropy(roundedNumerator);
    return roundedNumeratorEntropy;
  });
  const minNumeratorEntropy = Math.min(...numeratorEntropies);
  if (minNumeratorEntropy < rawBaseNumberEntropy / 2) {
    return minNumeratorEntropy;
  }
  return rawBaseNumberEntropy;
}

function calculateRawNumberEntropy(value: number): number {
  // Convert numbers with decimal points to integers by simply removing the decimal point but keeping the digits
  const str = value.toString();
  const withoutPoint = str.replace(".", "");
  // Remove trailing zeroes
  const withoutTrailingZeroes = withoutPoint.replace(/0+$/, "");

  const entropy = parseInt(withoutTrailingZeroes || "0");
  return entropy;
}

export function calculateEntropyScore(rawEntropy: number): number {
  // Prevent extremely large numbers as well numbers below 100 from having an outsized effect on the entropy score

  if (rawEntropy < 100) {
    return Math.log10(rawEntropy);
  }
  if (rawEntropy < 100_000) {
    return 10 * Math.log10(rawEntropy) - 20;
  }
  return Math.log10(rawEntropy) + 25;
}

export function calculateSequenceEntropyScore(values: number[]): number {
  const sum = values.reduce((acc, value) => {
    const rawNumberEntropy = calculateNumberEntropy(value);
    const individualEntropyScore = calculateEntropyScore(rawNumberEntropy);
    return acc + individualEntropyScore;
  }, 0);
  return sum;
}

export function calculateRowEntropyScore(
  sharedValues: number[],
  numComparedColumns: number
): number {
  if (sharedValues.length === 0) {
    return 0;
  }

  const sumEntropyScores = sharedValues.reduce((acc, value) => {
    const rawNumberEntropy = calculateNumberEntropy(value);
    const individualEntropyScore = calculateEntropyScore(rawNumberEntropy);
    return acc + individualEntropyScore;
  }, 0);

  // Adjust the score based on the number of compared columns
  const rowEntropyScore = sumEntropyScores / Math.sqrt(numComparedColumns);

  return rowEntropyScore;
}
