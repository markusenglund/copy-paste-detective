import { detectRepeatingFraction } from "./fraction";

export function calculateNumberEntropy(value: number): number {
  // Values that are common years should receive an entropy score of 100
  if (value >= 1900 && value <= 2030 && Number.isInteger(value)) {
    return 100;
  }
  const rawBaseNumberEntropy = calculateRawNumberEntropy(value);

  const tolerance = 0.001; // Tolerance for detecting fractions
  if (rawBaseNumberEntropy > 100000 && value > 0.1) {
    const squaredValue = Math.pow(value, 2);
    // Round to two decimals so it can deal with square root values of decimal numbers
    const roundedSquaredValue = Math.round(100 * squaredValue) / 100;
    if (Math.abs(squaredValue - roundedSquaredValue) < tolerance / 100) {
      const roundedSquaredEntropy =
        calculateRawNumberEntropy(roundedSquaredValue);
      if (roundedSquaredEntropy < rawBaseNumberEntropy) {
        return calculateRawNumberEntropy(roundedSquaredValue);
      }
    }
  }

  const repeatingFraction = detectRepeatingFraction(value);
  if (repeatingFraction) {
    return repeatingFraction.numerator;
  }

  const terminatingDecimalDenominators = [2, 4, 8];
  const terminatingDecimalNumeratorEntropies =
    terminatingDecimalDenominators.map((denominator) =>
      calculateRawNumberEntropy(value * denominator),
    );

  const minNumeratorEntropy = Math.min(...terminatingDecimalNumeratorEntropies);
  // Only use the fraction if it gives significantly lower entropy
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

  const entropy = Math.abs(parseInt(withoutTrailingZeroes || "0"));
  return entropy;
}

export function calculateEntropyScore(rawEntropy: number): number {
  if (rawEntropy <= 1) {
    return 0;
  }
  // Prevent extremely large numbers as well numbers below 100 from having an outsized effect on the entropy score
  if (rawEntropy < 100) {
    return Math.log10(rawEntropy);
  }
  if (rawEntropy < 100_000) {
    return 5 * Math.log10(rawEntropy) - 8;
  }
  return Math.log10(rawEntropy) + 12;
}

export function calculateSequenceEntropyScore(values: number[]): number {
  const sum = values.reduce((acc, value) => {
    const rawNumberEntropy = calculateNumberEntropy(value);
    const individualEntropyScore = calculateEntropyScore(rawNumberEntropy);
    return acc + individualEntropyScore;
  }, 0);
  return sum;
}
