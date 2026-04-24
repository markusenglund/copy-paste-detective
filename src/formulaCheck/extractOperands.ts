export function extractOperands(expression: string): string[] {
  const matches = expression.match(/\b[A-Z][A-Z0-9]*\b/g) ?? [];
  return [...new Set(matches)].sort();
}
