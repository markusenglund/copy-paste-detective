export function countDecimals(value: number): number {
  if (!Number.isFinite(value) || Number.isInteger(value)) return 0;
  const str = String(value);
  const dotIdx = str.indexOf(".");
  return dotIdx === -1 ? 0 : str.length - dotIdx - 1;
}
