export type Interval = [number, number];

export function countDecimals(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (Number.isInteger(value)) return 0;

  const str = String(value);
  const eIdx = str.indexOf("e");
  if (eIdx === -1) {
    const dotIdx = str.indexOf(".");
    return dotIdx === -1 ? 0 : str.length - dotIdx - 1;
  }

  const mantissa = str.slice(0, eIdx);
  const exponent = Number(str.slice(eIdx + 1));
  const dotIdx = mantissa.indexOf(".");
  const mantissaDecimals = dotIdx === -1 ? 0 : mantissa.length - dotIdx - 1;
  return Math.max(0, mantissaDecimals - exponent);
}

export function cellInterval(value: number): Interval {
  const decimals = countDecimals(value);
  const half = 0.5 * Math.pow(10, -decimals);
  return [value - half, value + half];
}

export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a[0] <= b[1] && b[0] <= a[1];
}

export function intervalGap(a: Interval, b: Interval): number {
  if (intervalsOverlap(a, b)) return 0;
  if (a[1] < b[0]) return b[0] - a[1];
  return a[0] - b[1];
}
