export function calculateNumberEntropy(value: number): number {
  if (value >= 1900 && value <= 2030 && Number.isInteger(value)) {
    return 100;
  }

  const str = value.toString();
  const withoutPoint = str.replace(".", "");
  const withoutTrailingZeroes = withoutPoint.replace(/0+$/, "");
  const withoutOneTrailingFive = withoutTrailingZeroes.replace(/5$/, "");

  const withoutRepeatingDigits = withoutOneTrailingFive.replace(
    /(\d)\1{3,}/g,
    (_, digit) => digit
  );
  const entropy = parseInt(withoutRepeatingDigits || "0");
  return entropy;
}

export function calculateEntropyScore(rawEntropy: number): number {
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

