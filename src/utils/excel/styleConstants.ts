/**
 * Light color palette for highlighting repeated sequences in Excel files.
 * Colors are designed to be easily distinguishable and pleasant to view.
 * When more than 10 sequences exist, colors will cycle.
 */
export const HIGHLIGHT_COLORS = [
  "FFD6D6", // Light red
  "D6F0FF", // Light blue
  "FFF0D6", // Light orange
  "D6FFD6", // Light green
  "FFD6FF", // Light magenta
  "FFFFD6", // Light yellow
  "D6FFFF", // Light cyan
  "E3D6FF", // Light purple
  "FFD6F0", // Light pink
  "D6E3D6", // Light sage
];

/**
 * Border style for creating boxes around sequences.
 * Uses thin black borders on all sides.
 */
export const SEQUENCE_BORDER_STYLE = {
  top: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } },
};

/**
 * Get color for a sequence based on its index.
 * Colors cycle when index exceeds palette size.
 */
export function getColorForSequenceIndex(index: number): string {
  return HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
}
