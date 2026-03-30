import type { AiProvider } from "./types";

export const claudeProvider: AiProvider = {
  async generateText() {
    throw new Error(
      "Claude provider is not yet implemented. Install @anthropic-ai/sdk and implement this file.",
    );
  },

  async generateMultiTurn() {
    throw new Error(
      "Claude provider is not yet implemented. Install @anthropic-ai/sdk and implement this file.",
    );
  },
};
