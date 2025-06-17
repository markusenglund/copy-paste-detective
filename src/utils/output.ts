import { SuspicionLevel } from "../types";

export const levelToSymbol: Record<SuspicionLevel, string> = {
  [SuspicionLevel.None]: "",
  [SuspicionLevel.Low]: "❔",
  [SuspicionLevel.Medium]: "✅",
  [SuspicionLevel.High]: "🔴",
};
