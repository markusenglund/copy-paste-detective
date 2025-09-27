export function getNumDecimals(value: number): number {
  return value.toString().split(".")[1]?.length || 0;
}
