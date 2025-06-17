export function calculateSequenceRegularity(sequence: number[]): {
  mostCommonIntervalSize: number;
  mostCommonIntervalSizePercentage: number;
} {
  if (sequence.length < 2) {
    return { mostCommonIntervalSize: 0, mostCommonIntervalSizePercentage: 0 };
  }
  if (sequence.every((value) => value === sequence[0])) {
    return {
      mostCommonIntervalSize: sequence.length - 1,
      mostCommonIntervalSizePercentage: (sequence.length - 1) / sequence.length,
    };
  }

  const intervalSizeByNumOccurences = new Map<number, number>();
  for (let i = 0; i < sequence.length - 1; i++) {
    const intervalSize = sequence[i + 1] - sequence[i];
    const numOccurences = intervalSizeByNumOccurences.get(intervalSize) ?? 0;
    intervalSizeByNumOccurences.set(intervalSize, numOccurences + 1);
  }
  const sortedIntervalSizes = [...intervalSizeByNumOccurences.entries()]
    .map(([intervalSize, numOccurences]) => ({
      intervalSize,
      numOccurences,
    }))
    .sort((a, b) => b.numOccurences - a.numOccurences);

  const mostCommonIntervalSize = sortedIntervalSizes[0].intervalSize;
  const mostCommonIntervalSizePercentage =
    (sortedIntervalSizes[0].numOccurences - 1) / (sequence.length - 1); // Subtract by one so the percentage is 0% if all intervals are unique, also so the percentage is never 100%
  return { mostCommonIntervalSizePercentage, mostCommonIntervalSize };
}
