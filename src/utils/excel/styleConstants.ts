/**
 * Light color palette for highlighting repeated sequences in Excel files.
 * Colors are designed to be easily distinguishable and pleasant to view.
 * When more than 10 sequences exist, colors will cycle.
 */
export const HIGHLIGHT_COLORS = [
  "FFE6E6", // Light red
  "E6F3FF", // Light blue
  "FFF4E6", // Light orange
  "E6FFE6", // Light green
  "FFE6FF", // Light magenta
  "FFFFE6", // Light yellow
  "E6FFFF", // Light cyan
  "F0E6FF", // Light purple
  "FFE6F0", // Light pink
  "E6F0E6", // Light sage
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
