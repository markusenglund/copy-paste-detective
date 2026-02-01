export const HIGHLIGHT_COLORS = [
  "FFB6C1",
  "FFD700",
  "40E0D0",
  "98FB98",
  "7FFF00",
  "FF1493",
  "FF69B4",
  "FA8072",
  "FF7F50",
  "F0E68C",
  "FFA500",
  "F5DEB3",
  "D2691E",
  "FFFFE0",
  "2E8B57",
  "32CD32",
  "E0FFFF",
  "87CEEB",
  "A433D3",
  "1E90FF",
  "6666CD",
  "E6E6FA",
  "DDA0DD",
  "F0F8FF",
];

/**
 * Border style for creating boxes around sequences.
 * Uses thin black borders on all sides.
 * ARGB format (FF prefix for full opacity) required by ExcelJS.
 */
export const SEQUENCE_BORDER_STYLE = {
  top: { style: "thin" as const, color: { argb: "FF000000" } },
  bottom: { style: "thin" as const, color: { argb: "FF000000" } },
  left: { style: "thin" as const, color: { argb: "FF000000" } },
  right: { style: "thin" as const, color: { argb: "FF000000" } },
};

/**
 * Get color for a sequence based on its index.
 * Colors cycle when index exceeds palette size.
 */
export function getColorForSequenceIndex(index: number): string {
  return HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
}
