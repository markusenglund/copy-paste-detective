
export const HIGHLIGHT_COLORS = [
  // Light pastel colors (original palette)
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
  "FFB3B3", // Medium red
  "B3D9FF", // Medium blue
  "FFD9B3", // Medium orange
  "B3FFB3", // Medium green
  "FFB3FF", // Medium magenta
  "FFFFB3", // Medium yellow
  "B3FFFF", // Medium cyan
  "C6B3FF", // Medium purple
  "FFB3D9", // Medium pink
  "B3C6B3", // Medium sage
  "FF9999", // Deeper red
  "99CCFF", // Deeper blue
  "FFCC99", // Deeper orange
  "99FF99", // Deeper green
  "FF99FF", // Deeper magenta
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
