export function roundFloatingPointInaccuracies(
  originalNumber: number,
  maxDecimalPlacesToTry = 10,
  tolerance = 1e-12,
): number {
  if (Number.isInteger(originalNumber)) {
    return originalNumber;
  }

  // Iterate from 0 decimal places up to the max plausible for the noise we want to remove
  for (let k = 0; k <= maxDecimalPlacesToTry; k++) {
    const candidateString = originalNumber.toFixed(k); // Can throw RangeError for huge/tiny k on some numbers
    const candidateNum = Number(candidateString);
    const difference = Math.abs(originalNumber - candidateNum);

    if (difference < tolerance) {
      return candidateNum;
    }
  }

  return originalNumber;
}
