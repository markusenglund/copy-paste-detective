export function calculateNumberEntropy(value: number): number {
  // Values that are common years should receive an entropy score of 100
  if (value >= 1900 && value <= 2030 && Number.isInteger(value)) {
    return 100;
  }

  // Convert numbers with decimal points to integers by simply removing the decimal point but keeping the digits
  const str = value.toString();
  const withoutPoint = str.replace(".", "");
  // Remove trailing zeroes
  const withoutTrailingZeroes = withoutPoint.replace(/0+$/, "");
  const withoutOneTrailingFive = withoutTrailingZeroes.replace(/5$/, "");

  // If a number has 4 or more repeating digits, only the first in the repeating sequence is kept
  const withoutRepeatingDigits = withoutOneTrailingFive.replace(
    /(\d)\1{3,}/g,
    (_, digit) => digit
  );
  const entropy = parseInt(withoutRepeatingDigits || "0");
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

