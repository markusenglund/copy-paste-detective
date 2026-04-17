import type { Interval } from "./intervalCheck";
import type { PointScope } from "./pythonRunner";

const MAX_FULL_CORNERS = 6;

export function extractOperands(expression: string): string[] {
  const matches = expression.match(/\b[A-Z][A-Z0-9]*\b/g) ?? [];
  return [...new Set(matches)].sort();
}

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0x100000000;
  };
}

function cartesianProduct(arrays: [number, number][]): number[][] {
  return arrays.reduce<number[][]>(
    (acc, [lo, hi]) =>
      acc.flatMap((prev) => [
        [...prev, lo],
        [...prev, hi],
      ]),
    [[]],
  );
}

export function generateCorners(
  usedOperands: string[],
  intervals: Record<string, Interval>,
  seed = 0,
): PointScope[] {
  if (usedOperands.length === 0) {
    return [{}];
  }

  const operandIntervals = usedOperands.map((op) => intervals[op] as Interval);

  if (usedOperands.length <= MAX_FULL_CORNERS) {
    return cartesianProduct(operandIntervals).map((values) =>
      Object.fromEntries(usedOperands.map((op, i) => [op, values[i]])),
    );
  }

  const rng = seededRandom(seed);
  const corners: PointScope[] = [];
  for (let i = 0; i < 64; i++) {
    const scope: PointScope = {};
    for (let j = 0; j < usedOperands.length; j++) {
      const [lo, hi] = operandIntervals[j];
      scope[usedOperands[j]] = rng() < 0.5 ? lo : hi;
    }
    corners.push(scope);
  }
  const midpoint: PointScope = {};
  for (let j = 0; j < usedOperands.length; j++) {
    const [lo, hi] = operandIntervals[j];
    midpoint[usedOperands[j]] = (lo + hi) / 2;
  }
  corners.push(midpoint);
  return corners;
}
