export function wrapInCodeBlock(content: string): string {
  // Wrap in sequence of backticks that is one character longer than the longest sequence in the wrapped block
  const backtickSequences = content.match(/`+/g) || [];

  const maxLength: number = Math.max(
    ...backtickSequences.map((seq) => seq.length),
  );

  const fenceLength = Math.max(3, maxLength + 1);
  const fence = "`".repeat(fenceLength);
  return `${fence}\n${content}\n${fence}`;
}
